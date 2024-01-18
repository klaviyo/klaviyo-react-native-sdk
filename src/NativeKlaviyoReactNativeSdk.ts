import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import type { KlaviyoEventAPI } from './Event';
import type { KlaviyoProfileApi } from './Profile';

/**
 * The Klaviyo React Native SDK Interface
 *
 * This interface extends the KlaviyoEventAPI and KlaviyoProfileApi interfaces,
 * providing a unified API for interacting with Klaviyo's event tracking and profile management features.
 */
export interface KlaviyoInterface extends KlaviyoEventAPI, KlaviyoProfileApi {
  /**
   * Initialize the Klaviyo SDK with your public API key.
   * This method should be called before any other methods in the SDK are used.
   * @param apiKey - Your public API key
   */
  initialize(apiKey: String): void;
}

export interface Spec extends TurboModule, KlaviyoInterface {}

export default TurboModuleRegistry.getEnforcing<Spec>('KlaviyoReactNativeSdk');
