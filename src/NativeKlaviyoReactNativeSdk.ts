import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { KlaviyoEventAPI } from './Event';

export interface KlaviyoSpec extends TurboModule, KlaviyoEventAPI {}

export default TurboModuleRegistry.getEnforcing<KlaviyoSpec>(
  'KlaviyoReactNativeSdk'
);
