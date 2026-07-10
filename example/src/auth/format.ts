/**
 * Small display-formatting helpers shared by the Auth screen's "Current
 * token" section and the Configure Response screen's live token-lifetime
 * preview, so the two don't duplicate countdown/timestamp formatting.
 */

/**
 * Formats a non-negative duration (in seconds) as `MM:SS`, or `H:MM:SS` once
 * it reaches an hour. Negative input is clamped to zero — callers are
 * expected to check "is this in the past?" themselves and show
 * "Expired"/"Refresh due" instead of calling this with a negative value.
 */
export function formatDurationHms(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Formats an absolute instant (seconds since epoch) as a locale date/time string. */
export function formatAbsoluteDateTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString();
}
