import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';
import type { KlaviyoEventAPI } from './Event';
import type { KlaviyoProfileApi } from './Profile';
import type { KlaviyoPushApi } from './Push';

export interface Spec
  extends TurboModule,
    KlaviyoEventAPI,
    KlaviyoProfileApi,
    KlaviyoPushApi {
  initialize(apiKey: String): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('KlaviyoReactNativeSdk');
