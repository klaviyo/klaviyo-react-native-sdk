/**
 * Minimal, dependency-free base64url <-> byte helpers for reading/minting
 * JWTs in the example app.
 *
 * React Native's JS engine (Hermes) doesn't ship a global `atob`/`btoa`, so we
 * implement the byte<->base64url conversion by hand rather than pulling in a
 * polyfill or a base64 package.
 *
 * Decoded/encoded strings are treated as Latin-1 (one JS char per byte, i.e.
 * the same behavior as the classic `atob`-based JWT-decode pattern used by
 * libraries like `jwt-decode`). That's sufficient here: the claims this app
 * actually reads (`iat`/`exp`) are always ASCII digits, so a full UTF-8
 * decoder would add complexity without changing what we can display. This is
 * display-only tooling and never participates in signature verification.
 */

/* eslint-disable no-bitwise -- bit manipulation is inherent to base64 encode/decode */

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Decodes a base64url string (no padding required) into a byte array. */
export function base64UrlDecodeToBytes(input: string): Uint8Array {
  // Some producers still pad base64url with '='; strip it defensively since
  // JWT segments are not supposed to be padded.
  const cleaned = input.replace(/[=]+$/, '');

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of cleaned) {
    const value = BASE64URL_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base64url character: ${JSON.stringify(char)}`);
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return Uint8Array.from(bytes);
}

/** Encodes a byte array into a base64url string (no padding). */
export function base64UrlEncodeFromBytes(bytes: Uint8Array): string {
  let result = '';
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      result += BASE64URL_ALPHABET.charAt((buffer >> bits) & 0x3f);
    }
  }

  if (bits > 0) {
    result += BASE64URL_ALPHABET.charAt((buffer << (6 - bits)) & 0x3f);
  }

  return result;
}

/** Decodes a base64url string into a Latin-1 string (one JS char per byte). */
export function base64UrlDecodeToLatin1(input: string): string {
  const bytes = base64UrlDecodeToBytes(input);
  let result = '';
  for (const byte of bytes) {
    result += String.fromCharCode(byte);
  }
  return result;
}

/** Encodes a Latin-1 string (one JS char per byte) into base64url. */
export function base64UrlEncodeFromLatin1(input: string): string {
  const bytes = Uint8Array.from(input, (char) => char.charCodeAt(0) & 0xff);
  return base64UrlEncodeFromBytes(bytes);
}
