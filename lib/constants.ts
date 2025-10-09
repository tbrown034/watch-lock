/**
 * Application-wide constants
 * Centralized configuration for magic numbers and shared values
 */

export const MESSAGE_CONSTRAINTS = {
  MAX_LENGTH: 280,
  WARNING_THRESHOLD: 250,
} as const;

export const GAME_CONSTRAINTS = {
  DEFAULT_MAX_INNING: 9,
  MESSAGE_FEED_MAX_HEIGHT: 800,
} as const;

export const UI_CONFIG = {
  TIMEZONE: 'America/Indiana/Indianapolis',
  DATE_FORMAT: {
    FULL: {
      month: 'long' as const,
      day: 'numeric' as const,
      year: 'numeric' as const,
    },
    TIME: {
      hour: 'numeric' as const,
      minute: '2-digit' as const,
    },
  },
} as const;

export const STORAGE_KEYS = {
  getMessagesKey: (gameId: string) => `watchlock_messages_${gameId}`,
  getUserPositionKey: (gameId: string) => `watchlock_position_${gameId}`,
} as const;
