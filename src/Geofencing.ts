export interface Geofence {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
}

/**
 * Interface for the Klaviyo location module
 */
export interface KlaviyoGeofencingApi {
  /**
   * Begin geofence monitoring
   * Once proper permissions are granted from the user, we will fetch
   * geofences configured for your account and begin reporting
   * geofence transitions as analytics events.
   */
  registerGeofencing(): void;

  /**
   * Stop monitoring geofences
   */
  unregisterGeofencing(): void;

  /**
   * Gets the currently monitored geofences from the native SDK.
   *
   * This is intended for demonstration and debugging purposes only.
   * It may be subject to change or removal without notice.
   *
   * @internal
   */
  getCurrentGeofences(
    callback: (result: { geofences: Geofence[] }) => void
  ): void;
}
