/**
 * Interface for the Klaviyo Push API
 */
export interface KlaviyoPushApi {
  /**
   * Set the push token for the current profile
   *
   * @param token
   */
  setPushToken(token: string): void;

  /**
   * Get the push token for the current profile from the SDK
   *
   * @param callback
   */
  getPushToken(callback: Function | undefined): string | null;

  /**
   * Set the badge count for the app icon
   *
   * @param count
   */
  setBadgeCount(count: number): void;
}
