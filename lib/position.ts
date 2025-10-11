/**
 * Core Position System
 * The heart of WatchLock - converting game positions to monotonic integers
 */

export type MlbOuts = 0 | 1 | 2 | 'END';
export type MlbPhase = 'PREGAME' | 'IN_GAME' | 'POSTGAME';

export interface MlbMeta {
  sport: 'mlb';
  inning: number;        // 1-9+ (extra innings allowed)
  half: 'TOP' | 'BOTTOM';
  outs: MlbOuts;         // 0-2 outs while in progress, END when the half concludes
  phase?: MlbPhase;      // Optional phase for pregame/postgame context
  batter?: string;       // Optional: player name, jersey #, or description
}

export const MLB_PREGAME_POSITION = -1;
export const MLB_POSTGAME_POSITION = 1_000_000; // Sentinel larger than any encoded inning

export interface Position {
  pos: number;           // Monotonic integer (0, 1, 2, ...)
  posMeta: MlbMeta;      // Sport-specific metadata
}

/**
 * Encode MLB position to monotonic integer
 * Each inning has 8 positions (Top: 0,1,2,END, Bottom: 0,1,2,END)
 *
 * Examples:
 * - Top 1st, 0 outs = 0
 * - Top 1st, 1 out = 1
 * - Top 1st, 2 outs = 2
 * - Top 1st, END = 3
 * - Bottom 1st, 0 outs = 4
 * - Bottom 1st, 1 out = 5
 * - Bottom 1st, 2 outs = 6
 * - Bottom 1st, END = 7
 * - Top 2nd, 0 outs = 8
 *
 * @param meta MLB position metadata
 * @returns Monotonic integer position
 */
export function encodeMlbPosition(meta: MlbMeta): number {
  if (meta.phase === 'PREGAME') {
    return MLB_PREGAME_POSITION;
  }

  if (meta.phase === 'POSTGAME') {
    return MLB_POSTGAME_POSITION;
  }

  const inningBase = (meta.inning - 1) * 8;
  const halfOffset = meta.half === 'TOP' ? 0 : 4;
  const outsValue = meta.outs === 'END' ? 3 : meta.outs;
  return inningBase + halfOffset + outsValue;
}

/**
 * Decode monotonic integer back to MLB position
 *
 * @param pos Monotonic integer position
 * @returns MLB position metadata
 */
export function decodeMlbPosition(pos: number): MlbMeta {
  if (pos <= MLB_PREGAME_POSITION) {
    return {
      sport: 'mlb',
      inning: 1,
      half: 'TOP',
      outs: 0,
      phase: 'PREGAME'
    };
  }

  if (pos >= MLB_POSTGAME_POSITION) {
    return {
      sport: 'mlb',
      inning: 9,
      half: 'BOTTOM',
      outs: 'END',
      phase: 'POSTGAME'
    };
  }

  const inning = Math.floor(pos / 8) + 1;
  const remainder = pos % 8;
  const half = remainder < 4 ? 'TOP' : 'BOTTOM';
  const outsRemainder = remainder % 4;
  const outs: MlbOuts = outsRemainder === 3 ? 'END' : (outsRemainder as 0 | 1 | 2);

  return {
    sport: 'mlb',
    inning,
    half,
    outs
  };
}

/**
 * Format MLB position for display
 *
 * @param meta MLB position metadata
 * @returns Human-readable position string (e.g., "Top 3rd • 2 outs" or "Top 3rd • End of inning")
 */
export function formatMlbPosition(meta: MlbMeta): string {
  if (meta.phase === 'PREGAME') {
    return 'Pregame';
  }

  if (meta.phase === 'POSTGAME') {
    return 'Final';
  }

  const halfStr = meta.half === 'TOP' ? 'Top' : 'Bottom';
  const inningOrdinal = getOrdinal(meta.inning);

  if (meta.outs === 'END') {
    const endLabel = meta.half === 'TOP' ? 'End of top half' : 'End of bottom half';
    return `${endLabel} • ${inningOrdinal}`;
  }

  const outsStr = meta.outs === 1 ? 'out' : 'outs';
  let positionStr = `${halfStr} ${inningOrdinal} • ${meta.outs} ${outsStr}`;

  if (meta.batter) {
    positionStr += ` • ${meta.batter} batting`;
  }

  return positionStr;
}

/**
 * Get ordinal suffix for inning number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Format position with team context (who's batting)
 *
 * @param meta MLB position metadata
 * @param awayTeam Name of away team
 * @param homeTeam Name of home team
 * @returns Position string with batting team (e.g., "Top 3rd • 2 outs • Cubs batting")
 */
export function formatMlbPositionWithTeams(
  meta: MlbMeta,
  awayTeam: string,
  homeTeam: string
): string {
  if (meta.phase === 'PREGAME') {
    return `Pregame • ${awayTeam} @ ${homeTeam}`;
  }

  if (meta.phase === 'POSTGAME') {
    return `Final • ${awayTeam} @ ${homeTeam}`;
  }

  const basePosition = formatMlbPosition(meta);

  // Don't add batting team for END position (inning is over)
  if (meta.outs === 'END') {
    return basePosition;
  }

  // If batter is already specified, formatMlbPosition already includes it
  if (meta.batter) {
    return basePosition;
  }

  const battingTeam = meta.half === 'TOP' ? awayTeam : homeTeam;
  return `${basePosition} • ${battingTeam} Batting`;
}

/**
 * THE RULE: Check if a message is visible based on user position
 * This is the core spoiler prevention logic
 *
 * @param messagePos Position of the message
 * @param userPos Current user position
 * @returns true if message should be visible, false otherwise
 */
export function isMessageVisible(messagePos: number, userPos: number): boolean {
  return messagePos <= userPos;
}

/**
 * Filter messages based on user position
 * Server-side filtering to prevent spoilers
 *
 * @param messages Array of messages with positions
 * @param userPos Current user position
 * @returns Filtered array of visible messages
 */
export function filterMessagesByPosition<T extends { pos: number }>(
  messages: T[],
  userPos: number
): T[] {
  return messages.filter(msg => isMessageVisible(msg.pos, userPos));
}

/**
 * Get the next major position milestone
 * Used for progress indicators
 *
 * @param currentPos Current position
 * @returns Next half-inning position
 */
export function getNextMilestone(currentPos: number): number {
  if (currentPos <= MLB_PREGAME_POSITION) {
    return 0;
  }

  if (currentPos >= MLB_POSTGAME_POSITION) {
    return MLB_POSTGAME_POSITION;
  }

  const currentInning = Math.floor(currentPos / 8) + 1;
  const currentHalf = (currentPos % 8) < 4 ? 'TOP' : 'BOTTOM';

  if (currentHalf === 'TOP') {
    // Next milestone is bottom of same inning
    return (currentInning - 1) * 8 + 4;
  } else {
    // Next milestone is top of next inning
    return currentInning * 8;
  }
}

/**
 * Validate MLB position metadata
 *
 * @param meta Position metadata to validate
 * @returns true if valid, false otherwise
 */
export function isValidMlbPosition(meta: MlbMeta): boolean {
  if (meta.phase === 'PREGAME' || meta.phase === 'POSTGAME') {
    return meta.sport === 'mlb';
  }

  return (
    meta.sport === 'mlb' &&
    meta.inning >= 1 &&
    (meta.half === 'TOP' || meta.half === 'BOTTOM') &&
    (meta.outs === 0 || meta.outs === 1 || meta.outs === 2 || meta.outs === 'END')
  );
}
