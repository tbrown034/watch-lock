import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { progressMarkers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encodeMlbPosition, isValidMlbPosition } from '@/lib/position';
import { sql } from '@vercel/postgres';

// GET /api/games/[gameId]/progress - Get user's current progress
export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = params;

    const progress = await db.query.progressMarkers.findFirst({
      where: and(
        eq(progressMarkers.gameId, gameId),
        eq(progressMarkers.userId, user.id)
      )
    });

    if (!progress) {
      // Return default starting position
      return NextResponse.json({
        pos: 0,
        posMeta: {
          sport: 'mlb',
          inning: 1,
          half: 'TOP',
          outs: 0
        }
      });
    }

    return NextResponse.json({
      pos: progress.pos,
      posMeta: progress.posMeta
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// PATCH /api/games/[gameId]/progress - Update user's progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = params;
    const { posMeta } = await request.json();

    // Validate position metadata
    if (!posMeta || !isValidMlbPosition(posMeta)) {
      return NextResponse.json(
        { error: 'Invalid position metadata' },
        { status: 400 }
      );
    }

    // CRITICAL: Always compute position server-side
    const newPos = encodeMlbPosition(posMeta);

    // CRITICAL: Monotonic progress - only allow forward movement
    // Use UPSERT with condition to prevent regression
    await db.execute(sql`
      INSERT INTO progress_markers (game_id, user_id, pos, pos_meta, updated_at)
      VALUES (${gameId}, ${user.id}, ${newPos}, ${JSON.stringify(posMeta)}, NOW())
      ON CONFLICT (game_id, user_id)
      DO UPDATE SET
        pos = ${newPos},
        pos_meta = ${JSON.stringify(posMeta)},
        updated_at = NOW()
      WHERE progress_markers.pos < ${newPos}  -- Only update if moving forward
    `);

    // Get the actual current position (in case update was rejected)
    const currentProgress = await db.query.progressMarkers.findFirst({
      where: and(
        eq(progressMarkers.gameId, gameId),
        eq(progressMarkers.userId, user.id)
      )
    });

    return NextResponse.json({
      pos: currentProgress?.pos ?? newPos,
      posMeta: currentProgress?.posMeta ?? posMeta,
      updated: currentProgress?.pos === newPos
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}