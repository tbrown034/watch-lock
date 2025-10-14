import { UI_CONFIG } from '@/lib/constants';

export interface NflScheduleGame {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  venue?: string;
  status?: string;
  detailedState?: string;
  score?: {
    home: number;
    away: number;
  };
  quarter?: string;
  timeRemaining?: string;
  gameLink?: string;
}

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  team: {
    displayName: string;
    abbreviation?: string;
  };
  score?: string;
}

interface EspnGame {
  id: string;
  date: string;
  name: string;
  shortName?: string;
  status: {
    type: {
      state: string;
      description: string;
      shortDetail?: string;
    };
  };
  competitions: Array<{
    competitors: EspnCompetitor[];
    venue?: {
      fullName?: string;
    };
    status?: {
      period?: number;
      displayClock?: string;
    };
  }>;
}

interface EspnScheduleResponse {
  events: EspnGame[];
}

const ESPN_NFL_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

function formatStartTime(dateIso: string, timezone: string): string {
  try {
    const date = new Date(dateIso);
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

  return formatter.format(date).replace(/-/g, '');
}

export async function fetchTodayNflGames(timezone: string = UI_CONFIG.TIMEZONE): Promise<NflScheduleGame[]> {
  const dateParam = formatDateParam(new Date(), timezone);
  const url = `${ESPN_NFL_API}?dates=${dateParam}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WatchLock/1.0 (https://watchlock.app)',
      Accept: 'application/json',
    },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch NFL schedule (${response.status})`);
  }

  const data = (await response.json()) as EspnScheduleResponse;
  const games = data?.events ?? [];

  return games.map((game) => {
    const competition = game.competitions[0];
    const homeTeam = competition.competitors.find((c) => c.homeAway === 'home');
    const awayTeam = competition.competitors.find((c) => c.homeAway === 'away');

    const isLive = game.status.type.state === 'in';
    const isFinal = game.status.type.state === 'post';

    const score = (isLive || isFinal) && homeTeam?.score && awayTeam?.score
      ? {
          home: parseInt(homeTeam.score, 10),
          away: parseInt(awayTeam.score, 10),
        }
      : undefined;

    const quarter = isLive && competition.status?.period
      ? `Q${competition.status.period}`
      : undefined;

    const timeRemaining = isLive && competition.status?.displayClock
      ? competition.status.displayClock
      : undefined;

    return {
      id: `nfl-${game.id}`,
      gameId: game.id,
      homeTeam: homeTeam?.team.displayName ?? 'Home',
      awayTeam: awayTeam?.team.displayName ?? 'Away',
      startTime: formatStartTime(game.date, timezone),
      venue: competition.venue?.fullName,
      status: game.status.type.state,
      detailedState: game.status.type.description,
      score,
      quarter,
      timeRemaining,
      gameLink: `https://www.espn.com/nfl/game/_/gameId/${game.id}`,
    };
  });
}
