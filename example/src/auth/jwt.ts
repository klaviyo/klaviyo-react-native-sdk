import { base64UrlDecodeToLatin1 } from './base64url';

/**
 * Numeric claims read from a JWT payload, for display purposes only.
 *
 * No signature verification is performed here — this mirrors the fact that
 * the SDK itself only reads the `exp`/`iat` claims off the token and never
 * validates the signature client-side.
 */
export interface JwtClaims {
  /** Issued-at time, in seconds since the Unix epoch, or `null` if absent/unreadable. */
  iat: number | null;
  /** Expiration time, in seconds since the Unix epoch, or `null` if absent/unreadable. */
  exp: number | null;
}

/**
 * Reads the `exp`/`iat` numeric claims from a JWT's payload segment.
 *
 * Performs no signature verification — display only, mirroring the SDK's own
 * client-side handling. Surrounding whitespace is trimmed first
 * (paste-friendly). Returns `null` if the input isn't a well-formed 3-segment
 * JWT, or if the payload segment can't be base64url-decoded and parsed as
 * JSON.
 */
export function readJwtClaims(token: string): JwtClaims | null {
  const segments = token.trim().split('.');
  if (segments.length !== 3) {
    return null;
  }

  const payloadSegment = segments[1];
  if (!payloadSegment) {
    return null;
  }

  try {
    const json = base64UrlDecodeToLatin1(payloadSegment);
    const payload: unknown = JSON.parse(json);
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const { iat, exp } = payload as Record<string, unknown>;
    return {
      iat: typeof iat === 'number' ? iat : null,
      exp: typeof exp === 'number' ? exp : null,
    };
  } catch {
    return null;
  }
}

/**
 * Token well-formedness status for display, mirroring MAGE-794's "Token
 * status" contract.
 */
export type TokenStatus = 'empty' | 'well-formed' | 'malformed';

/** Derives the display {@link TokenStatus} for a raw token string. */
export function getTokenStatus(token: string): TokenStatus {
  if (token.trim().length === 0) {
    return 'empty';
  }
  const claims = readJwtClaims(token);
  return claims?.exp != null ? 'well-formed' : 'malformed';
}
