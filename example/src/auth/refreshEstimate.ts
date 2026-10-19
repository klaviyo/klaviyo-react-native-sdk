/**
 * Mirrors the native SDK's `AuthTokenManager.refreshTarget` proactive-refresh
 * estimate, so the example app's "Refresh in" countdown approximates when the
 * SDK will actually attempt a proactive token refresh:
 *
 * ```
 * target = max(iat + 5s, min(iat + 0.9 * (exp - iat), exp - 30s))
 * ```
 *
 * (0.9 lifetime fraction; 30s leeway floor; 5s lower-bound lead.) The SDK
 * evaluates the lower bound relative to *acquisition* time, which the app
 * can't observe directly, so `iat` is used as a proxy — exact for
 * normal-lifetime tokens, and only approximate for pathologically short/old
 * ones.
 *
 * @param iatSeconds Issued-at time, in seconds since the Unix epoch.
 * @param expSeconds Expiration time, in seconds since the Unix epoch.
 * @returns Estimated proactive-refresh time, in seconds since the Unix epoch.
 */
export function estimateRefreshTarget(
  iatSeconds: number,
  expSeconds: number
): number {
  const lifetime = expSeconds - iatSeconds;
  const proactiveFraction = iatSeconds + 0.9 * lifetime;
  const leewayFloor = expSeconds - 30;
  const leadFloor = iatSeconds + 5;

  return Math.max(leadFloor, Math.min(proactiveFraction, leewayFloor));
}
