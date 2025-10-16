import { UI_CONFIG } from '@/lib/constants';

export interface MlbScheduleGame {
  id: string;
  gamePk: number;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  gameDate: string; // ISO date string from API
  venue?: string;
  status?: string;
  detailedState?: string;
  score?: {
    home: number;
    away: number;
  };
  inning?: string;
  gameLink?: string;
}

interface MlbScheduleResponse {
  dates?: Array<{
    date: string;
    games: Array<{
      gamePk: number;
      gameDate: string;
      venue?: { name?: string };
      status?: {
        abstractGameState?: string;
        detailedState?: string;
      };
      teams: {
        home: {
          team: { name: string };
          score?: number;
        };
        away: {
          team: { name: string };
          score?: number;
        };
      };
      linescore?: {
        currentInningOrdinal?: string;
        inningState?: string;
      };
    }>;
  }>;
}

const MLB_SCHEDULE_URL = 'https://statsapi.mlb.com/api/v1/schedule';

function formatStartTime(gameDate: string, timezone: string): string {
  try {
    const date = new Date(gameDate);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(date);
  } catch {
    return 'TBD';
  }
}

function formatDateParam(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

export async function fetchTodayMlbGames(timezone: string = UI_CONFIG.TIMEZONE): Promise<MlbScheduleGame[]> {
  const todayParam = formatDateParam(new Date(), timezone);
  const url = `${MLB_SCHEDULE_URL}?sportId=1&date=${todayParam}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WatchLock/1.0 (https://watchlock.app)',
      Accept: 'application/json',
    },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MLB schedule (${response.status})`);
  }

  const data = (await response.json()) as MlbScheduleResponse;
  const games = data?.dates?.[0]?.games ?? [];

  return games.map((game) => {
    const isLive = game.status?.abstractGameState === 'Live';
    const score = isLive && game.teams.home.score !== undefined && game.teams.away.score !== undefined
      ? { home: game.teams.home.score, away: game.teams.away.score }
      : undefined;

    const inning = isLive && game.linescore?.inningState && game.linescore?.currentInningOrdinal
      ? `${game.linescore.inningState} ${game.linescore.currentInningOrdinal}`
      : undefined;

    return {
      id: `mlb-${game.gamePk}`,
      gamePk: game.gamePk,
      homeTeam: game.teams.home.team.name,
      awayTeam: game.teams.away.team.name,
      startTime: formatStartTime(game.gameDate, timezone),
      gameDate: game.gameDate, // Include the ISO date string
      venue: game.venue?.name,
      status: game.status?.abstractGameState,
      detailedState: game.status?.detailedState,
      score,
      inning,
      gameLink: `https://www.mlb.com/gameday/${game.gamePk}`,
    };
  });
}
