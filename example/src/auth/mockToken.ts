import { base64UrlEncodeFromLatin1 } from './base64url';

/** Header for the structurally-valid, deliberately UNSIGNED mock JWTs this app mints. */
const MOCK_JWT_HEADER = { alg: 'HS256', typ: 'JWT' };

/**
 * Placeholder signature segment. The SDK never verifies token signatures
 * client-side, so an unsigned mock token is fine for exercising the
 * auth-token provider flow.
 */
const DUMMY_SIGNATURE = 'klaviyo-example-app-mock-signature';

export interface MockJwtOptions {
  /** Expiration time, in seconds since the Unix epoch. */
  exp: number;
  /** Issued-at time, in seconds since the Unix epoch. Defaults to now. */
  iat?: number;
  /** Subject claim. Defaults to a fixed example value. */
  sub?: string;
}

// Bumped on every mint so two calls with the same iat/exp (e.g. a repeating
// response with 0s delay, where two provider calls land in the same
// wall-clock second) still produce distinct token strings via a unique
// `jti` claim, rather than an identical payload -> identical JWT.
let mockJwtSequence = 0;

/**
 * Mints a structurally-valid but deliberately **unsigned** mock JWT
 * (`alg: HS256`, `sub`, `iat`, `exp`, `jti`, dummy signature).
 *
 * Used by the Configure Response screen's "Return mock token" outcome so
 * testers can exercise the SDK without needing a real signed token. Each
 * call mints a distinct token (unique `jti`), even when called repeatedly
 * with the same `iat`/`exp` -- e.g. a repeating last-row response, where
 * every subsequent provider call reuses the same scripted duration/date.
 */
export function mintMockJwt({
  exp,
  iat = Math.floor(Date.now() / 1000),
  sub = 'example-app-mock-user',
}: MockJwtOptions): string {
  mockJwtSequence += 1;
  const payload = {
    sub,
    iat: Math.round(iat),
    exp: Math.round(exp),
    jti: `mock-${mockJwtSequence}-${Date.now().toString(36)}`,
  };

  const header = base64UrlEncodeFromLatin1(JSON.stringify(MOCK_JWT_HEADER));
  const body = base64UrlEncodeFromLatin1(JSON.stringify(payload));
  const signature = base64UrlEncodeFromLatin1(DUMMY_SIGNATURE);

  return `${header}.${body}.${signature}`;
}

/**
 * A deliberately malformed (non-JWT) token string, for the "Return mock
 * token" outcome's Malformed kind.
 */
export const MALFORMED_MOCK_TOKEN = 'not-a-real-jwt-malformed-token';

/** A selectable "expires in" duration preset for the mock-token Duration mode. */
export interface MockTokenDurationPreset {
  label: string;
  /** Seconds from time-of-serving. Negative means already expired. */
  seconds: number;
}

/**
 * Duration presets offered by the Configure Response screen's mock-token
 * "Duration" expiration mode, per MAGE-794 §Screen 2: 45s, 90s, 5m, and an
 * already-expired preset (shown in red by the screen).
 */
export const MOCK_TOKEN_DURATION_PRESETS: readonly MockTokenDurationPreset[] = [
  { label: '45 seconds', seconds: 45 },
  { label: '90 seconds', seconds: 90 },
  { label: '5 minutes', seconds: 300 },
  { label: 'Already expired (-1 min)', seconds: -60 },
];
