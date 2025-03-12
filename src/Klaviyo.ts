import type { KlaviyoEventAPI } from './Event';
import type { KlaviyoProfileApi } from './Profile';
import type { KlaviyoPushApi } from './Push';

/**
 * The Klaviyo React Native SDK Interface
 *
 * This interface extends the KlaviyoEventAPI and KlaviyoProfileApi interfaces,
 * providing a unified API for interacting with Klaviyo's event tracking and profile management features.
 */
export interface KlaviyoInterface
  extends KlaviyoEventAPI,
    KlaviyoProfileApi,
    KlaviyoPushApi {
  /**
   * Initializes the Klaviyo SDK with the given API key.
   *
   * @param apiKey Your public API key
   */
  initialize(apiKey: string): void;

  /**
   * [ANDROID] used to track lifecycle interactions before the sdk is initialized
   */
  registerLifecycleCallbacks(): void;
}
