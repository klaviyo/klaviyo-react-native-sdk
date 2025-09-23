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
}
