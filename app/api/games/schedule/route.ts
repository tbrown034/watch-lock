import { NextResponse } from 'next/server';
import { fetchTodayMlbGames } from '@/lib/services/mlbSchedule';
import { fetchTodayNflGames } from '@/lib/services/nflSchedule';

export const revalidate = 1800;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'mlb';

  try {
    if (sport === 'nfl') {
      const games = await fetchTodayNflGames();
      return NextResponse.json({ games, source: 'espn-nfl' }, { status: 200 });
    }

    // Default to MLB
    const games = await fetchTodayMlbGames();
    return NextResponse.json({ games, source: 'mlb-statsapi' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch ${sport.toUpperCase()} schedule`, error);
    return NextResponse.json(
      {
        games: [],
        source: 'mock',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
