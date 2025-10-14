import { UI_CONFIG } from '@/lib/constants';
import type { NflMeta, NflPhase } from '@/lib/position';

const ESPN_NFL_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';

interface GameStatus {
  type: {
    state: string;
    description: string;
    detail?: string;
  };
}

interface EspnCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  team: {
    displayName: string;
    abbreviation: string;
  };
  score?: string;
  statistics?: Array<{
    name: string;
    displayValue: string;
  }>;
}

interface EspnSituation {
  lastPlay?: {
    text?: string;
  };
  down?: number;
  distance?: number;
  yardLine?: number;
  possession?: string;
  isRedZone?: boolean;
  homeTimeouts?: number;
  awayTimeouts?: number;
}

interface GameData {
  header: {
    competitions: Array<{
      status: {
        period: number;
        displayClock: string;
        type: {
          state: string;
          description: string;
        };
      };
      competitors: EspnCompetitor[];
    }>;
  };
  drives?: {
    current?: {
      plays?: Array<{
        text?: string;
      }>;
    };
  };
  situation?: EspnSituation;
  gameInfo?: {
    venue?: {
      fullName?: string;
    };
  };
}

export interface NflGameState {
  posMeta: NflMeta | null;
  status: string;
  detailedState: string;
  message: string;
  startTime?: string;
  isLive: boolean;
  isFinal: boolean;
  score?: {
    home: { points: number; name: string };
    away: { points: number; name: string };
  };
  possession?: 'home' | 'away';
  lastPlay?: string;
  situation?: {
    down?: number;
    distance?: number;
    yardLine?: number;
  };
}

function normalizeTime(displayClock: string): string {
  // ESPN returns time like "15:00", "7:32", "0:00"
  // Ensure format is consistent MM:SS
  const parts = displayClock.split(':');
  if (parts.length === 2) {
    const [min, sec] = parts;
    return `${min}:${sec.padStart(2, '0')}`;
  }
  return displayClock;
}

function determinePhase(period: number, state: string): NflPhase {
  if (state === 'pre') return 'PREGAME';
  if (state === 'post') return 'POSTGAME';

  switch (period) {
    case 1:
      return 'Q1';
    case 2:
      return 'Q2';
    case 3:
      return 'Q3';
    case 4:
      return 'Q4';
    case 5:
      return 'OVERTIME';
    default:
      return 'Q1';
  }
}

function normalizePosMeta(
  period: number,
  displayClock: string,
  state: string,
  situation: EspnSituation | undefined,
  competitors: EspnCompetitor[]
): NflMeta | null {
  const phase = determinePhase(period, state);

  if (phase === 'PREGAME') {
    return {
      sport: 'nfl',
      quarter: 1,
      time: '15:00',
      possession: null,
      phase: 'PREGAME',
    };
  }

  if (phase === 'POSTGAME') {
    return {
      sport: 'nfl',
      quarter: 4,
      time: '0:00',
      possession: null,
      phase: 'POSTGAME',
    };
  }

  const quarter = Math.min(period, 5) as 1 | 2 | 3 | 4 | 5;
  const time = normalizeTime(displayClock);

  let possession: 'home' | 'away' | null = null;
  if (situation?.possession) {
    const possessionTeam = competitors.find((c) => c.id === situation.possession);
    if (possessionTeam) {
      possession = possessionTeam.homeAway;
    }
  }

  return {
    sport: 'nfl',
    quarter,
    time,
    possession,
    down: situation?.down as 1 | 2 | 3 | 4 | undefined,
    distance: situation?.distance,
    yardLine: situation?.yardLine,
    phase,
  };
}

export async function fetchNflGameState(
  gameId: string,
  timezone: string = UI_CONFIG.TIMEZONE
): Promise<NflGameState> {
  const response = await fetch(`${ESPN_NFL_API}?event=${gameId}`, {
    headers: {
      'User-Agent': 'WatchLock/1.0 (https://watchlock.app)',
      Accept: 'application/json',
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch NFL game data (${response.status})`);
  }

  const data = (await response.json()) as GameData;
  const competition = data.header.competitions[0];
  const status = competition.status.type.state;
  const detailedState = competition.status.type.description;
  const period = competition.status.period;
  const displayClock = competition.status.displayClock;

  const isLive = status === 'in';
  const isFinal = status === 'post';

  const homeTeam = competition.competitors.find((c) => c.homeAway === 'home');
  const awayTeam = competition.competitors.find((c) => c.homeAway === 'away');

  const posMeta = normalizePosMeta(period, displayClock, status, data.situation, competition.competitors);

  let message: string;
  if (isLive && posMeta) {
    const quarterLabel = posMeta.quarter <= 4 ? `Q${posMeta.quarter}` : 'OT';
    message = `Live: ${quarterLabel} ${posMeta.time}`;
  } else if (isFinal) {
    message = 'Final — sync reflects the last recorded play.';
  } else {
    message = `Status: ${detailedState}`;
  }

  const score = homeTeam?.score && awayTeam?.score
    ? {
        home: {
          points: parseInt(homeTeam.score, 10),
          name: homeTeam.team.displayName,
        },
        away: {
          points: parseInt(awayTeam.score, 10),
          name: awayTeam.team.displayName,
        },
      }
    : undefined;

  const lastPlay = data.situation?.lastPlay?.text || data.drives?.current?.plays?.[0]?.text;

  const situation = data.situation
    ? {
        down: data.situation.down,
        distance: data.situation.distance,
        yardLine: data.situation.yardLine,
      }
    : undefined;

  let possession: 'home' | 'away' | undefined;
  if (data.situation?.possession) {
    const possessionTeam = competition.competitors.find((c) => c.id === data.situation?.possession);
    if (possessionTeam) {
      possession = possessionTeam.homeAway;
    }
  }

  return {
    posMeta,
    status,
    detailedState,
    message,
    isLive,
    isFinal,
    score,
    possession,
    lastPlay,
    situation,
  };
}
