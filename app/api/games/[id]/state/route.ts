import { NextResponse } from 'next/server';
import { fetchMlbGameState } from '@/lib/services/mlbGameState';
import { mockGames } from '@/lib/mock-data';
import { UI_CONFIG } from '@/lib/constants';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ message: 'Missing game id' }, { status: 400 });
  }

  if (!id.startsWith('mlb-')) {
    const mockGame = mockGames.find((game) => game.id === id);
    const start = mockGame?.startTime ? `${mockGame.startTime} ${UI_CONFIG.TIMEZONE.split('/').pop()}` : 'TBD';
    return NextResponse.json({
      source: 'mock',
      status: 'demo',
      message: `Demo matchup scheduled for ${start}. Use the controls to set your own progress.`,
      posMeta: null,
    });
  }

  const gamePk = Number(id.replace('mlb-', ''));
  if (Number.isNaN(gamePk)) {
    return NextResponse.json({ message: 'Invalid MLB game id' }, { status: 400 });
  }

  try {
    const state = await fetchMlbGameState(gamePk);
    return NextResponse.json({
      source: 'mlb',
      ...state,
    });
  } catch (error) {
    console.error('Failed to fetch MLB game state', error);
    return NextResponse.json(
      {
        source: 'mlb',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        posMeta: null,
      },
      { status: 502 }
    );
  }
}
