import { UI_CONFIG } from '@/lib/constants';
import type { MlbMeta, MlbPhase } from '@/lib/position';

const MLB_GAME_FEED_URL = 'https://statsapi.mlb.com/api/v1.1/game';

interface GameStatus {
  abstractGameState?: string;
  detailedState?: string;
  statusCode?: string;
}

interface GameDateTime {
  dateTime?: string;
  officialDate?: string;
}

interface GameData {
  status?: GameStatus;
  datetime?: GameDateTime;
  teams?: {
    home?: { name?: string };
    away?: { name?: string };
  };
}

interface LineScore {
  currentInning?: number;
  currentInningOrdinal?: string;
  inningState?: string;
  isTopInning?: boolean;
  outs?: number;
  teams?: {
    home?: { runs?: number; hits?: number; errors?: number };
    away?: { runs?: number; hits?: number; errors?: number };
  };
  innings?: Array<{
    num?: number;
    home?: { runs?: number | null };
    away?: { runs?: number | null };
  }>;
  offense?: {
    batter?: { fullName?: string; jerseyNumber?: string };
    onDeck?: { fullName?: string };
    inHole?: { fullName?: string };
    first?: { fullName?: string; jerseyNumber?: string };
    second?: { fullName?: string; jerseyNumber?: string };
    third?: { fullName?: string; jerseyNumber?: string };
  };
  defense?: {
    pitcher?: { fullName?: string; jerseyNumber?: string };
  };
}

interface FeedResponse {
  gameData?: GameData;
  liveData?: {
    linescore?: LineScore;
    plays?: {
      currentPlay?: {
        result?: { description?: string };
        count?: { balls?: number; strikes?: number; outs?: number };
      };
    };
  };
}

export interface MlbGameState {
  posMeta: MlbMeta | null;
  status: string;
  detailedState: string;
  message: string;
  startTime?: string;
  isLive: boolean;
  isFinal: boolean;
  score?: {
    home: { runs: number; hits: number; errors: number; name: string };
    away: { runs: number; hits: number; errors: number; name: string };
    innings?: Array<{ num: number; home?: number | null; away?: number | null }>;
  };
  bases?: {
    first?: string;
    second?: string;
    third?: string;
  };
  matchup?: {
    batter?: string;
    pitcher?: string;
    onDeck?: string;
    inHole?: string;
    count?: { balls: number; strikes: number };
  };
  lastPlay?: string;
}

function formatTime(dateIso: string | undefined, timezone: string): string | undefined {
  if (!dateIso) {
    return undefined;
  }

  try {
    const date = new Date(dateIso);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(date);
  } catch {
    return undefined;
  }
}

function normalizePosMeta(linescore: LineScore | undefined): MlbMeta | null {
  if (!linescore?.currentInning || linescore.isTopInning === undefined) {
    return null;
  }

  const outs = Math.max(0, Math.min(linescore.outs ?? 0, 2)) as 0 | 1 | 2;
  return {
    sport: 'mlb',
    inning: linescore.currentInning,
    half: linescore.isTopInning ? 'TOP' : 'BOTTOM',
    outs,
    phase: 'IN_GAME',
  };
}

export async function fetchMlbGameState(
  gamePk: number,
  timezone: string = UI_CONFIG.TIMEZONE
): Promise<MlbGameState> {
  const response = await fetch(`${MLB_GAME_FEED_URL}/${gamePk}/feed/live`, {
    headers: {
      'User-Agent': 'WatchLock/1.0 (https://watchlock.app)',
      Accept: 'application/json',
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MLB feed (${response.status})`);
  }

  const data = (await response.json()) as FeedResponse;
  const status = data.gameData?.status?.abstractGameState ?? 'Preview';
  const detailedState = data.gameData?.status?.detailedState ?? 'Scheduled';
  const startTime = formatTime(data.gameData?.datetime?.dateTime ?? data.gameData?.datetime?.officialDate, timezone);
  const isLive = status.toLowerCase() === 'live';
  const isFinal = status.toLowerCase() === 'final';
  const posMeta = normalizePosMeta(data.liveData?.linescore);

  let message: string;
  if (isLive && posMeta) {
    const inningOrdinal = data.liveData?.linescore?.currentInningOrdinal;
    const inningState = data.liveData?.linescore?.inningState;
    message = inningOrdinal && inningState
      ? `Live: ${inningState} of the ${inningOrdinal}`
      : 'Live game in progress';
  } else if (isFinal) {
    message = 'Final — sync reflects the last recorded inning.';
  } else if (startTime) {
    message = `Scheduled for ${startTime} ${timezone.split('/').pop()}`;
  } else {
    message = `Status: ${detailedState}`;
  }

  let resolvedPosMeta: MlbMeta | null = posMeta;

  if (!resolvedPosMeta) {
    if (isFinal) {
      resolvedPosMeta = {
        sport: 'mlb',
        inning: data.liveData?.linescore?.currentInning ?? 9,
        half: data.liveData?.linescore?.isTopInning ? 'TOP' : 'BOTTOM',
        outs: 'END',
        phase: 'POSTGAME'
      };
    } else if (!isLive) {
      resolvedPosMeta = {
        sport: 'mlb',
        inning: 1,
        half: 'TOP',
        outs: 0,
        phase: 'PREGAME'
      };
    }
  } else if (isFinal) {
    resolvedPosMeta = { ...resolvedPosMeta, outs: 'END', phase: 'POSTGAME' };
  }

  if (resolvedPosMeta && resolvedPosMeta.phase === undefined && !isLive) {
    const phase: MlbPhase = isFinal ? 'POSTGAME' : 'IN_GAME';
    resolvedPosMeta = { ...resolvedPosMeta, phase };
  }

  const score = data.liveData?.linescore?.teams
    ? {
        home: {
          runs: data.liveData?.linescore?.teams?.home?.runs ?? 0,
          hits: data.liveData?.linescore?.teams?.home?.hits ?? 0,
          errors: data.liveData?.linescore?.teams?.home?.errors ?? 0,
          name: data.gameData?.teams?.home?.name ?? 'Home'
        },
        away: {
          runs: data.liveData?.linescore?.teams?.away?.runs ?? 0,
          hits: data.liveData?.linescore?.teams?.away?.hits ?? 0,
          errors: data.liveData?.linescore?.teams?.away?.errors ?? 0,
          name: data.gameData?.teams?.away?.name ?? 'Away'
        },
        innings: data.liveData?.linescore?.innings?.map((inning) => ({
          num: inning.num ?? 0,
          home: inning.home?.runs ?? null,
          away: inning.away?.runs ?? null
        }))
      }
    : undefined;

  const bases = data.liveData?.linescore?.offense
    ? {
        first: data.liveData.linescore.offense.first?.fullName ?? undefined,
        second: data.liveData.linescore.offense.second?.fullName ?? undefined,
        third: data.liveData.linescore.offense.third?.fullName ?? undefined
      }
    : undefined;

  const matchup = data.liveData?.linescore
    ? {
        batter:
          data.liveData.linescore.offense?.batter?.fullName ??
          data.liveData.linescore.offense?.batter?.jerseyNumber ??
          undefined,
        pitcher:
          data.liveData.linescore.defense?.pitcher?.fullName ??
          data.liveData.linescore.defense?.pitcher?.jerseyNumber ??
          undefined,
        onDeck: data.liveData.linescore.offense?.onDeck?.fullName ?? undefined,
        inHole: data.liveData.linescore.offense?.inHole?.fullName ?? undefined,
        count: {
          balls: data.liveData.plays?.currentPlay?.count?.balls ?? 0,
          strikes: data.liveData.plays?.currentPlay?.count?.strikes ?? 0
        }
      }
    : undefined;

  const lastPlay = data.liveData?.plays?.currentPlay?.result?.description;

  return {
    posMeta: resolvedPosMeta,
    status,
    detailedState,
    message,
    startTime,
    isLive,
    isFinal,
    score,
    bases,
    matchup,
    lastPlay
  };
}
