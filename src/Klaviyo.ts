import type { KlaviyoEventAPI } from './Event';
import type { KlaviyoProfileApi } from './Profile';
import type { KlaviyoPushApi } from './Push';
import type { KlaviyoFormsApi } from './Forms';
import type { KlaviyoGeofencingApi } from './Geofencing';
import type { KlaviyoDeepLinkAPI } from './KlaviyoDeepLinkAPI';

/**
 * The Klaviyo React Native SDK Interface
 *
 * This interface extends the KlaviyoEventAPI and KlaviyoProfileApi interfaces,
 * providing a unified API for interacting with Klaviyo's event tracking and profile management features.
 */
export interface KlaviyoInterface
  extends
    KlaviyoEventAPI,
    KlaviyoProfileApi,
    KlaviyoPushApi,
    KlaviyoGeofencingApi,
    KlaviyoFormsApi,
    KlaviyoDeepLinkAPI {
  /**
   * Initializes the Klaviyo SDK with the given API key.
   *
   * @param apiKey Your public API key
   */
  initialize(apiKey: string): void;

  /**
   * Enable or disable all Klaviyo SDK logging at runtime.
   *
   * Logging is enabled by default. Disabling silences all log output from the
   * native Klaviyo SDKs on both platforms; re-enabling restores the previous
   * log verbosity.
   *
   * Note: on iOS this does not affect logging from `KlaviyoSwiftExtension`,
   * which runs in a separate app extension process.
   *
   * @param enabled - Whether SDK logging should be enabled
   */
  setLoggingEnabled(enabled: boolean): void;

  /**
   * Retrieve whether Klaviyo SDK logging is currently enabled.
   *
   * @param callback - The callback function to handle the response
   */
  isLoggingEnabled(callback: (enabled: boolean) => void): void;
}
