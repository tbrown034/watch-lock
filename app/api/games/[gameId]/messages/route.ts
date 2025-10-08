import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { messages, progressMarkers, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { encodeMlbPosition, isValidMlbPosition } from '@/lib/position';
import { sql } from '@vercel/postgres';

// GET /api/games/[gameId]/messages - Get filtered messages based on user progress
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

    // Get user's current progress
    const progress = await db.query.progressMarkers.findFirst({
      where: and(
        eq(progressMarkers.gameId, gameId),
        eq(progressMarkers.userId, user.id)
      )
    });

    const userPos = progress?.pos ?? 0;

    // SERVER-SIDE FILTERING - THE CRITICAL SECURITY RULE
    // Only return messages where message.pos <= user.pos
    const visibleMessages = await db.execute(sql`
      SELECT
        m.id,
        m.body,
        m.kind,
        m.pos,
        m.pos_meta as "posMeta",
        m.created_at as "createdAt",
        u.id as "authorId",
        u.username as "authorUsername",
        u.avatar_url as "authorAvatarUrl"
      FROM messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.game_id = ${gameId}
        AND m.pos <= ${userPos}  -- SERVER-SIDE FILTER
      ORDER BY m.pos ASC, m.created_at ASC
    `);

    // Count hidden messages (for UI hint)
    const totalCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM messages
      WHERE game_id = ${gameId}
    `);

    const hiddenCount = Number(totalCount.rows[0].count) - visibleMessages.rows.length;

    // Transform messages for response
    const formattedMessages = visibleMessages.rows.map(row => ({
      id: row.id,
      body: row.body,
      kind: row.kind,
      pos: row.pos,
      posMeta: row.posMeta,
      createdAt: row.createdAt,
      author: {
        id: row.authorId,
        username: row.authorUsername,
        avatarUrl: row.authorAvatarUrl
      }
    }));

    return NextResponse.json({
      messages: formattedMessages,
      hiddenCount
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/games/[gameId]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = params;
    const { body, posMeta } = await request.json();

    // Validate input
    if (!body || !posMeta) {
      return NextResponse.json(
        { error: 'Message body and position required' },
        { status: 400 }
      );
    }

    if (body.length > 280) {
      return NextResponse.json(
        { error: 'Message too long (max 280 characters)' },
        { status: 400 }
      );
    }

    if (!isValidMlbPosition(posMeta)) {
      return NextResponse.json(
        { error: 'Invalid position metadata' },
        { status: 400 }
      );
    }

    // CRITICAL: Always compute position server-side, never trust client
    const pos = encodeMlbPosition(posMeta);

    // Insert message
    const [newMessage] = await db.insert(messages).values({
      gameId,
      authorId: user.id,
      body: body.trim(),
      pos, // Server-computed position
      posMeta,
      kind: 'text'
    }).returning();

    // Get author info for response
    const author = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    });

    return NextResponse.json({
      message: {
        ...newMessage,
        author: {
          id: author?.id,
          username: author?.username,
          avatarUrl: author?.avatarUrl
        }
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}