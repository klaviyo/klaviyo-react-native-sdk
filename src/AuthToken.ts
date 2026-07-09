/**
 * Interface for the Klaviyo Auth Token API.
 *
 * Personalized In-App Forms require the SDK to present a user-identifying JWT to
 * the Klaviyo backend. The React Native SDK is a thin wrapper: the underlying
 * native iOS and Android SDKs own all token state management (caching, proactive
 * refresh, timeouts, WebView injection, and all token-related logging). The
 * wrapper's sole responsibility is to bridge the host's JS-side provider to the
 * native SDK.
 */
export interface KlaviyoAuthTokenApi {
  /**
   * Registers a provider that the native SDK invokes when it needs to acquire or
   * refresh an authentication token (JWT) for the current end-user.
   *
   * The provider is an `async` function returning the current end-user's JWT, by
   * whatever mechanism the host application uses to obtain one (e.g. calling its
   * auth server, exchanging an OAuth refresh token, reading from a session
   * cache). It should read the current user fresh on each invocation rather than
   * capturing identity at registration.
   *
   * Calling this replaces any previously-registered provider. The call itself is
   * synchronous (fire-and-forget) and returns `void`, consistent with other
   * configuration methods such as {@link KlaviyoProfileApi.setProfile} and
   * {@link KlaviyoFormsApi.registerForInAppForms}.
   *
   * @param provider Async function that resolves with the current end-user's JWT.
   */
  registerAuthTokenProvider(provider: AuthTokenProvider): void;

  /**
   * Detaches a previously-registered auth token provider — e.g. on user logout.
   *
   * Forwards to the native SDK, which clears the provider reference and tears
   * down all associated token state (cached token, scheduled refresh, in-flight
   * fetch). Re-registering after unregister works normally.
   */
  unregisterAuthTokenProvider(): void;
}

/**
 * Host-provided function that supplies an auth token (JWT) to the SDK.
 *
 * Invoked by the native SDK when it needs a token. Returns a `Promise` that
 * resolves with the current end-user's JWT, or rejects if a token cannot be
 * obtained.
 */
export type AuthTokenProvider = () => Promise<string>;

/**
 * Name of the native-to-JS event emitted over `NativeEventEmitter` when the
 * native SDK requests an auth token from the wrapper-provided provider.
 */
export const AUTH_TOKEN_REQUESTED_EVENT = 'klaviyo:authTokenRequested';

/**
 * Payload of an {@link AUTH_TOKEN_REQUESTED_EVENT} event.
 *
 * The `id` correlation identifier is generated on the native side and must be
 * echoed back via `respondToAuthTokenRequest` so the native SDK can resolve the
 * awaiting provider invocation.
 */
export interface AuthTokenRequestedEvent {
  /** Correlation ID identifying this token request. */
  id: string;
}

/**
 * Validates that a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Parses a raw native event payload into a validated {@link AuthTokenRequestedEvent}.
 *
 * Returns `null` and logs a warning if the required `id` correlation field is
 * missing or empty. Never logs token contents (the request payload carries only
 * the correlation ID, not a token).
 *
 * @param data Raw event data from the native bridge
 * @returns A validated AuthTokenRequestedEvent, or null if the payload is invalid
 */
export function parseAuthTokenRequestedEvent(
  data: Record<string, unknown>
): AuthTokenRequestedEvent | null {
  const { id } = data;

  if (!isNonEmptyString(id)) {
    console.warn(
      `[Klaviyo] Ignoring auth token request with invalid id: ${JSON.stringify(id)}`
    );
    return null;
  }

  return { id };
}
