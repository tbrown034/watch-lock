/**
 * Core Position System
 * The heart of WatchLock - converting game positions to monotonic integers
 */

export interface MlbMeta {
  sport: 'mlb';
  inning: number;        // 1-9+ (extra innings allowed)
  half: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;      // Only 0-2, never 3
}

export interface Position {
  pos: number;           // Monotonic integer (0, 1, 2, ...)
  posMeta: MlbMeta;      // Sport-specific metadata
}

/**
 * Encode MLB position to monotonic integer
 * Each inning has 6 positions (Top: 0,1,2 outs, Bottom: 0,1,2 outs)
 *
 * Examples:
 * - Top 1st, 0 outs = 0
 * - Top 1st, 1 out = 1
 * - Top 1st, 2 outs = 2
 * - Bottom 1st, 0 outs = 3
 * - Bottom 1st, 1 out = 4
 * - Bottom 1st, 2 outs = 5
 * - Top 2nd, 0 outs = 6
 *
 * @param meta MLB position metadata
 * @returns Monotonic integer position
 */
export function encodeMlbPosition(meta: MlbMeta): number {
  const inningBase = (meta.inning - 1) * 6;
  const halfOffset = meta.half === 'TOP' ? 0 : 3;
  return inningBase + halfOffset + meta.outs;
}

/**
 * Decode monotonic integer back to MLB position
 *
 * @param pos Monotonic integer position
 * @returns MLB position metadata
 */
export function decodeMlbPosition(pos: number): MlbMeta {
  const inning = Math.floor(pos / 6) + 1;
  const remainder = pos % 6;
  const half = remainder < 3 ? 'TOP' : 'BOTTOM';
  const outs = (remainder % 3) as 0 | 1 | 2;

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
 * @returns Human-readable position string
 */
export function formatMlbPosition(meta: MlbMeta): string {
  const halfStr = meta.half === 'TOP' ? 'T' : 'B';
  const outsStr = meta.outs === 1 ? 'out' : 'outs';
  return `${halfStr}${meta.inning} • ${meta.outs} ${outsStr}`;
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
  const currentInning = Math.floor(currentPos / 6) + 1;
  const currentHalf = (currentPos % 6) < 3 ? 'TOP' : 'BOTTOM';

  if (currentHalf === 'TOP') {
    // Next milestone is bottom of same inning
    return (currentInning - 1) * 6 + 3;
  } else {
    // Next milestone is top of next inning
    return currentInning * 6;
  }
}

/**
 * Validate MLB position metadata
 *
 * @param meta Position metadata to validate
 * @returns true if valid, false otherwise
 */
export function isValidMlbPosition(meta: MlbMeta): boolean {
  return (
    meta.sport === 'mlb' &&
    meta.inning >= 1 &&
    (meta.half === 'TOP' || meta.half === 'BOTTOM') &&
    (meta.outs === 0 || meta.outs === 1 || meta.outs === 2)
  );
}