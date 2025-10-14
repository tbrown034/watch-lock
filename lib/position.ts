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

export type NflDown = 1 | 2 | 3 | 4 | 'END';
export type NflPhase = 'PREGAME' | 'Q1' | 'Q2' | 'HALFTIME' | 'Q3' | 'Q4' | 'OVERTIME' | 'POSTGAME';

export interface NflMeta {
  sport: 'nfl';
  quarter: 1 | 2 | 3 | 4 | 5; // 1-4 for regulation, 5 for overtime
  time: string;          // "15:00", "7:32", etc.
  possession: 'home' | 'away' | null;
  down?: NflDown;        // Current down or END for end of quarter
  distance?: number;     // Yards to go for first down
  yardLine?: number;     // 0-100 (0 = own goal line, 50 = midfield, 100 = opponent goal line)
  phase?: NflPhase;      // Game phase
}

export const MLB_PREGAME_POSITION = -1;
export const MLB_POSTGAME_POSITION = 1_000_000; // Sentinel larger than any encoded inning

export const NFL_PREGAME_POSITION = -1;
export const NFL_POSTGAME_POSITION = 2_000_000; // Sentinel larger than any encoded quarter

export interface Position {
  pos: number;           // Monotonic integer (0, 1, 2, ...)
  posMeta: MlbMeta | NflMeta; // Sport-specific metadata
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

/**
 * Encode NFL position to monotonic integer
 * Each quarter has 900 positions (15 minutes = 900 seconds)
 * Position = quarter_base + seconds_elapsed
 *
 * Examples:
 * - Q1 15:00 (start) = 0
 * - Q1 10:00 = 300
 * - Q1 0:00 (end) = 899
 * - Q2 15:00 (start) = 900
 * - Q4 0:00 (end) = 3599
 * - OT starts at 3600
 *
 * @param meta NFL position metadata
 * @returns Monotonic integer position
 */
export function encodeNflPosition(meta: NflMeta): number {
  if (meta.phase === 'PREGAME') {
    return NFL_PREGAME_POSITION;
  }

  if (meta.phase === 'POSTGAME') {
    return NFL_POSTGAME_POSITION;
  }

  // Parse time string "MM:SS"
  const [minutes, seconds] = meta.time.split(':').map(Number);
  const timeInSeconds = minutes * 60 + seconds;

  // Calculate seconds elapsed in quarter (15:00 - current time)
  const secondsElapsed = 900 - timeInSeconds;

  // Quarter base positions: Q1=0, Q2=900, Q3=1800, Q4=2700, OT=3600
  const quarterBase = (meta.quarter - 1) * 900;

  return quarterBase + secondsElapsed;
}

/**
 * Decode monotonic integer back to NFL position
 *
 * @param pos Monotonic integer position
 * @returns NFL position metadata
 */
export function decodeNflPosition(pos: number): NflMeta {
  if (pos <= NFL_PREGAME_POSITION) {
    return {
      sport: 'nfl',
      quarter: 1,
      time: '15:00',
      possession: null,
      phase: 'PREGAME'
    };
  }

  if (pos >= NFL_POSTGAME_POSITION) {
    return {
      sport: 'nfl',
      quarter: 4,
      time: '0:00',
      possession: null,
      phase: 'POSTGAME'
    };
  }

  // Determine quarter (0-899 = Q1, 900-1799 = Q2, etc.)
  const quarter = Math.min(Math.floor(pos / 900) + 1, 5) as 1 | 2 | 3 | 4 | 5;

  // Calculate seconds elapsed in quarter
  const secondsElapsed = pos % 900;

  // Convert to time remaining (15:00 - elapsed)
  const timeRemaining = 900 - secondsElapsed;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const time = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return {
    sport: 'nfl',
    quarter,
    time,
    possession: null
  };
}

/**
 * Format NFL position for display
 *
 * @param meta NFL position metadata
 * @returns Human-readable position string (e.g., "Q3 7:32 • 2nd & 8 • Home possession")
 */
export function formatNflPosition(meta: NflMeta): string {
  if (meta.phase === 'PREGAME') {
    return 'Pregame';
  }

  if (meta.phase === 'POSTGAME') {
    return 'Final';
  }

  if (meta.phase === 'HALFTIME') {
    return 'Halftime';
  }

  const quarter = meta.quarter <= 4 ? `Q${meta.quarter}` : 'OT';
  let positionStr = `${quarter} ${meta.time}`;

  if (meta.down && meta.down !== 'END' && meta.distance !== undefined) {
    const downSuffix = ['st', 'nd', 'rd', 'th'][meta.down - 1];
    positionStr += ` • ${meta.down}${downSuffix} & ${meta.distance}`;

    if (meta.yardLine !== undefined) {
      positionStr += ` at ${meta.yardLine}`;
    }
  }

  if (meta.possession) {
    positionStr += ` • ${meta.possession === 'home' ? 'Home' : 'Away'} ball`;
  }

  return positionStr;
}

/**
 * Format NFL position with team context
 *
 * @param meta NFL position metadata
 * @param awayTeam Name of away team
 * @param homeTeam Name of home team
 * @returns Position string with team names
 */
export function formatNflPositionWithTeams(
  meta: NflMeta,
  awayTeam: string,
  homeTeam: string
): string {
  if (meta.phase === 'PREGAME') {
    return `Pregame • ${awayTeam} @ ${homeTeam}`;
  }

  if (meta.phase === 'POSTGAME') {
    return `Final • ${awayTeam} @ ${homeTeam}`;
  }

  if (meta.phase === 'HALFTIME') {
    return `Halftime • ${awayTeam} @ ${homeTeam}`;
  }

  const basePosition = formatNflPosition(meta);

  if (meta.possession) {
    const teamWithBall = meta.possession === 'home' ? homeTeam : awayTeam;
    return basePosition.replace(meta.possession === 'home' ? 'Home ball' : 'Away ball', `${teamWithBall} ball`);
  }

  return basePosition;
}

/**
 * Validate NFL position metadata
 *
 * @param meta Position metadata to validate
 * @returns true if valid, false otherwise
 */
export function isValidNflPosition(meta: NflMeta): boolean {
  if (meta.phase === 'PREGAME' || meta.phase === 'POSTGAME' || meta.phase === 'HALFTIME') {
    return meta.sport === 'nfl';
  }

  return (
    meta.sport === 'nfl' &&
    meta.quarter >= 1 &&
    meta.quarter <= 5 &&
    /^\d{1,2}:\d{2}$/.test(meta.time)
  );
}
