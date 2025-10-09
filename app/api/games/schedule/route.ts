import { NextResponse } from 'next/server';
import { fetchTodayMlbGames } from '@/lib/services/mlbSchedule';

export const revalidate = 60 * 30;

export async function GET() {
  try {
    const games = await fetchTodayMlbGames();
    return NextResponse.json({ games, source: 'mlb-statsapi' }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch MLB schedule', error);
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
