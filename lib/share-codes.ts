/**
 * Share Code Generation
 * Creates unambiguous 6-character codes for room sharing
 */

// Unambiguous character set (no I, O, 1, 0 for clarity)
const SHARE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SHARE_CODE_LENGTH = 6;

/**
 * Generate a random share code
 *
 * @returns 6-character uppercase share code
 */
export function generateShareCode(): string {
  let code = '';
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * SHARE_CODE_CHARS.length);
    code += SHARE_CODE_CHARS[randomIndex];
  }
  return code;
}

/**
 * Validate a share code format
 *
 * @param code Share code to validate
 * @returns true if valid format, false otherwise
 */
export function isValidShareCode(code: string): boolean {
  if (!code || code.length !== SHARE_CODE_LENGTH) {
    return false;
  }

  const upperCode = code.toUpperCase();
  for (const char of upperCode) {
    if (!SHARE_CODE_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize a share code (uppercase, trim)
 *
 * @param code Share code to normalize
 * @returns Normalized share code
 */
export function normalizeShareCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Format share code for display (add spacing)
 *
 * @param code Share code to format
 * @returns Formatted share code (e.g., "ABC 123")
 */
export function formatShareCode(code: string): string {
  if (code.length !== SHARE_CODE_LENGTH) {
    return code;
  }
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Generate a unique share code (with retry logic for database)
 * This would be used with a database check for uniqueness
 *
 * @param isUnique Function to check if code is unique
 * @param maxRetries Maximum number of attempts
 * @returns Unique share code or null if max retries exceeded
 */
export async function generateUniqueShareCode(
  isUnique: (code: string) => Promise<boolean>,
  maxRetries: number = 10
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateShareCode();
    if (await isUnique(code)) {
      return code;
    }
  }
  return null; // Failed to generate unique code
}