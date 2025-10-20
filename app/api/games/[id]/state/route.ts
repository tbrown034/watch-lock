/**
 * GET /api/games/[id]/state
 *
 * Fetches live game state from MLB/NFL APIs
 *
 * AUTHENTICATION: None (intentionally public)
 *
 * WHY PUBLIC?
 * This endpoint proxies public data from MLB StatsAPI and ESPN APIs.
 * The data itself is public information (scores, innings, etc).
 * Making it public allows:
 * - Faster page loads (no auth check)
 * - Easier debugging and testing
 * - Consistent with the source APIs being public
 *
 * PRIVACY: This does NOT expose any user data, rooms, or messages.
 * Those are protected by RLS and require authentication.
 *
 * REQUEST:
 * - [id]: Game ID (format: "mlb-746532" or "nfl-2024010800")
 *
 * RESPONSE (MLB Success):
 * {
 *   "source": "mlb",
 *   "score": { "away": 3, "home": 2 },
 *   "inning": 5,
 *   "half": "TOP",
 *   "outs": 1,
 *   "isFinal": false,
 *   "posMeta": { "sport": "mlb", "inning": 5, "half": "TOP", "outs": 1 }
 * }
 *
 * RESPONSE (NFL Success):
 * {
 *   "source": "nfl",
 *   "score": { "away": 21, "home": 17 },
 *   "quarter": 3,
 *   "time": "8:42",
 *   "possession": "away",
 *   "isFinal": false,
 *   "posMeta": { "sport": "nfl", "quarter": 3, "time": "8:42", "possession": "away" }
 * }
 *
 * RESPONSE (Error):
 * {
 *   "source": "mlb" | "nfl",
 *   "status": "error",
 *   "message": "Error description",
 *   "posMeta": null
 * }
 */

import { NextResponse } from 'next/server';
import { fetchMlbGameState } from '@/lib/services/mlbGameState';
import { fetchNflGameState } from '@/lib/services/nflGameState';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// Force dynamic rendering (no static caching)
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ message: 'Missing game id' }, { status: 400 });
  }

  // Handle NFL games
  if (id.startsWith('nfl-')) {
    const gameId = id.replace('nfl-', '');
    try {
      const state = await fetchNflGameState(gameId);
      return NextResponse.json({
        source: 'nfl',
        ...state,
      });
    } catch (error) {
      console.error('Failed to fetch NFL game state', error);
      return NextResponse.json(
        {
          source: 'nfl',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          posMeta: null,
        },
        { status: 502 }
      );
    }
  }

  // Handle MLB games
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
