/**
 * Shared validation helpers for bridge payloads.
 */

/**
 * Validates that a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
