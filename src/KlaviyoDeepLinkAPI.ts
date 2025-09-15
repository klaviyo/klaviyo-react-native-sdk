/**
 * A function that handles deep link URLs
 * @param url - The deep link URL to handle
 */
export type DeepLinkHandler = (url: string) => void;

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
  handleUniversalTrackingLink(trackingLink: string): boolean;

  /**
   * Registers a deep link handler that will be called when a deep link is received.
   * The handler will be invoked with the deep link URL as a string parameter.
   *
   * @param handler - Function to call when a deep link is received
   *
   * @example
   * ```typescript
   * Klaviyo.registerDeepLinkHandler((url: string) => {
   *   console.log('Received deep link:', url);
   *   // Handle navigation or other logic based on the URL
   * });
   * ```
   */
  registerDeepLinkHandler(handler: DeepLinkHandler): void;
}
