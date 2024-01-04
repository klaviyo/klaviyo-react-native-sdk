import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import type { Spec } from './NativeKlaviyoReactNativeSdk';
import { type KlaviyoProfilePropertyType, type Profile } from './Profile';
import type { Events } from './Event';
export const Klaviyo: Spec = {
  initialize(apiKey: String): void {
    KlaviyoReactNativeSdk.initialize(apiKey);
  },

  setProfile(profile: Profile): void {
    KlaviyoReactNativeSdk.setProfile(profile);
  },

  setProfileAttribute(
    propertyKey: KlaviyoProfilePropertyType,
    value: String
  ): void {
    KlaviyoReactNativeSdk.setProfileAttribute(propertyKey, value);
  },

  setEmail(email: String): void {
    KlaviyoReactNativeSdk.setEmail(email);
  },

  setExternalId(externalId: String): void {
    KlaviyoReactNativeSdk.setExternalId(externalId);
  },

  setPhoneNumber(phoneNumber: String): void {
    KlaviyoReactNativeSdk.setPhoneNumber(phoneNumber);
  },

  setPushToken(pushToken: String): void {
    KlaviyoReactNativeSdk.setPushToken(pushToken);
  },

  resetProfile(): void {
    KlaviyoReactNativeSdk.resetProfile();
  },

  createEvent(event: Events): void {
    console.log('createEvent', event);
    KlaviyoReactNativeSdk.createEvent(event.name, event);
  },

  getEmail(callback: Function | undefined): String | null {
    return KlaviyoReactNativeSdk.getEmail(callback);
  },

  getExternalId(callback: Function | undefined): String | null {
    return KlaviyoReactNativeSdk.getExternalId(callback);
  },

  getPhoneNumber(callback: Function | undefined): String | null {
    return KlaviyoReactNativeSdk.getPhoneNumber(callback);
  },

  getPushToken(callback: Function | undefined): String | null {
    return KlaviyoReactNativeSdk.getPushToken(callback);
  },
};

export type { Events, Identifiers } from './Event';
export { MetricName } from './Event';
export type {
  Profile,
  ProfileProperties,
  KlaviyoProfilePropertyType,
  ProfileProperty,
  Location,
} from './Profile';
