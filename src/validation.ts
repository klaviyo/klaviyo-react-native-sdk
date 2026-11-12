/**
 * Shared validation helpers for bridge payloads.
 */

/**
 * Validates that a value is a non-empty string, treating whitespace-only
 * strings as empty (a blank bridged payload is not a meaningful value).
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
