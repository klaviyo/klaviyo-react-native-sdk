import type { IEvent } from './NativeKlaviyoReactNativeSdk';
import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

interface IKlaviyo {
  readonly createEvent: (event: IEvent) => void;
}

export const Klaviyo: IKlaviyo = {
  createEvent(event: IEvent): void {
    KlaviyoReactNativeSdk.createEvent(event);
  },
};

export { EventProperty, EventType } from './NativeKlaviyoReactNativeSdk';
