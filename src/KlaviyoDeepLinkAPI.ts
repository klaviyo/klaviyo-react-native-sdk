/**
 * A handler that receives a resolved deep link URL.
 *
 * @param url - The resolved destination URL, as a string.
 */
export type DeepLinkHandler = (url: string) => void;

/**
 * The event name emitted by the native bridge when the SDK resolves a deep
 * link (push notification deep link, In-App Form CTA, or universal tracking
 * link). Exposed for testing; consumers should use
 * {@link KlaviyoDeepLinkAPI#registerDeepLinkHandler} instead of subscribing to
 * this event directly.
 */
export const DEEP_LINK_RESOLVED_EVENT = 'KlaviyoOnDeepLinkResolved';

/**
 * Klaviyo Deep Link API
 */
export interface KlaviyoDeepLinkAPI {
  /**
   * Resolves a Klaviyo tracking link to a Universal Link URL,
   * then handles navigation to the resolved URL.
   * The link must be a valid Klaviyo universal tracking link:
   * - Uses HTTPS protocol
   * - Path starts with '/u/'
   *
   * @param trackingLink - The tracking link to be handled
   * @returns {boolean} - Whether the link was handled successfully
   */
  handleUniversalTrackingLink(trackingLink: string | null): boolean;

  /**
   * Registers a handler that receives the resolved destination URL whenever the
   * Klaviyo SDK opens a deep link — including push notification deep links,
   * In-App Form CTAs, and {@link KlaviyoDeepLinkAPI#handleUniversalTrackingLink}
   * resolutions.
   *
   * When a handler is registered, the native SDK delivers the resolved URL to
   * it **instead of** invoking the platform's default URL opener. This is the
   * recommended approach when your tracking links resolve to destinations on
   * your own app's associated domain (i.e. your own universal links): on iOS,
   * letting the SDK call `UIApplication.open(_:)` on a self-owned universal link
   * triggers Apple's anti-loop protection and bounces the user out to Safari.
   * Taking control of navigation here avoids that.
   *
   * Only one handler can be active at a time — calling this a second time
   * removes the previous subscription before registering the new one. When no
   * handler is registered, the SDK falls back to its default link-opening
   * behavior, so existing {@link KlaviyoDeepLinkAPI#handleUniversalTrackingLink}
   * integrations continue to work unchanged.
   *
   * @param handler - Function invoked with the resolved destination URL.
   * @returns A function that unsubscribes the handler when called.
   *
   * @example
   * ```typescript
   * const unsubscribe = Klaviyo.registerDeepLinkHandler((url) => {
   *   // Take full control of navigation, e.g. with React Navigation:
   *   navigationRef.navigate(parseUrl(url));
   * });
   *
   * // Later, when you no longer need the handler:
   * unsubscribe();
   * ```
   */
  registerDeepLinkHandler(handler: DeepLinkHandler): () => void;
}
