import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import type { Spec } from './NativeKlaviyoReactNativeSdk';
import {
  type KlaviyoProfilePropertyType,
  type Profile,
  formatProfile,
} from './Profile';
import type { Event } from './Event';

export const Klaviyo: Spec = {
  initialize(apiKey: String): void {
    KlaviyoReactNativeSdk.initialize(apiKey);
  },
  setProfile(profile: Profile): void {
    KlaviyoReactNativeSdk.setProfile(formatProfile(profile));
  },
  setExternalId(externalId: String): void {
    KlaviyoReactNativeSdk.setExternalId(externalId);
  },
  getExternalId(callback: Function | undefined): String | null {
    return KlaviyoReactNativeSdk.getExternalId(callback);
  },
  setEmail(email: String): void {
    KlaviyoReactNativeSdk.setEmail(email);
  },
  getEmail(callback: Function | undefined): String | null {
    return KlaviyoReactNativeSdk.getEmail(callback);
  },
  setPhoneNumber(phoneNumber: String): void {
    KlaviyoReactNativeSdk.setPhoneNumber(phoneNumber);
  },
  getPhoneNumber(callback: Function | undefined): String | null {
    return KlaviyoReactNativeSdk.getPhoneNumber(callback);
  },
  setProfileAttribute(
    propertyKey: KlaviyoProfilePropertyType,
    value: String
  ): void {
    KlaviyoReactNativeSdk.setProfileAttribute(propertyKey, value);
  },
  resetProfile(): void {
    KlaviyoReactNativeSdk.resetProfile();
  },
  createEvent(event: Event): void {
    KlaviyoReactNativeSdk.createEvent(event);
  },
};

export { EventName } from './Event';
export type { Event } from './Event';
export {
  type Profile,
  type ProfileProperties,
  type KlaviyoProfilePropertyType,
  type Location,
  ProfileProperty,
} from './Profile';
