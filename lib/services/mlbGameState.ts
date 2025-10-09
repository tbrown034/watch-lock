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
}

interface LineScore {
  currentInning?: number;
  currentInningOrdinal?: string;
  inningState?: string;
  isTopInning?: boolean;
  outs?: number;
}

interface FeedResponse {
  gameData?: GameData;
  liveData?: {
    linescore?: LineScore;
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

  return {
    posMeta: resolvedPosMeta,
    status,
    detailedState,
    message,
    startTime,
    isLive,
    isFinal,
  };
}
