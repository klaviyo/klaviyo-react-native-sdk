import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import type { KlaviyoEventAPI } from './Event';
import type { KlaviyoProfileApi } from './Profile';

export interface Spec extends TurboModule, KlaviyoEventAPI, KlaviyoProfileApi {
  initialize(apiKey: String): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('KlaviyoReactNativeSdk');
