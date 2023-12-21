import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import { EventType } from './Event';
import type { KlaviyoSpec } from './NativeKlaviyoReactNativeSdk';

export const Klaviyo: KlaviyoSpec = {
  createEvent(name: EventType, properties?: Record<any, Object>): void {
    this.createCustomEvent(name, properties);
  },
  createCustomEvent(name: string, properties?: Record<any, Object>): void {
    KlaviyoReactNativeSdk.createEvent(name, properties);
  },
};

export { EventProperty, EventType } from './Event';
