import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { IEvent } from './Event';

export interface Spec extends TurboModule {
  createEvent(event: IEvent): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('KlaviyoReactNativeSdk');
