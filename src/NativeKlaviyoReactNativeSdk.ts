import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import type { KlaviyoEventAPI } from './Event';
import type { KlaviyoProfileApi } from './Profile';

/**
 * The Klaviyo React Native SDK Interface
 */
export interface KlaviyoInterface extends KlaviyoEventAPI, KlaviyoProfileApi {
  /**
   * Initialize the Klaviyo SDK with your public API key
   * @param apiKey - Your public API key
   */
  initialize(apiKey: String): void;
}

export interface Spec extends TurboModule, KlaviyoInterface {}

export default TurboModuleRegistry.getEnforcing<Spec>('KlaviyoReactNativeSdk');
