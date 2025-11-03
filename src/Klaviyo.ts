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
  extends KlaviyoEventAPI,
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
}
