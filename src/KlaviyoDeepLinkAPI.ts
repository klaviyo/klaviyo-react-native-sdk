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
