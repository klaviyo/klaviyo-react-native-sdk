import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import { EventType } from './Event';
import type { Spec } from './NativeKlaviyoReactNativeSdk';
import type { KlaviyoProfilePropertyType, ProfileProperties } from './Profile';

export const Klaviyo: Spec = {
  initialize(apiKey: String): void {
    KlaviyoReactNativeSdk.initialize(apiKey);
  },

  setProfile(profile: ProfileProperties): void {
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

  getEmail(): String | null {
    return KlaviyoReactNativeSdk.getEmail();
  },

  getExternalId(): String | null {
    return KlaviyoReactNativeSdk.getExternalId();
  },

  getPhoneNumber(): String | null {
    return KlaviyoReactNativeSdk.getPhoneNumber();
  },

  getPushToken(): String | null {
    return KlaviyoReactNativeSdk.getPushToken();
  },

  createEvent(name: EventType, properties?: Record<any, Object>): void {
    this.createCustomEvent(name.toString(), properties);
  },

  createCustomEvent(name: string, properties?: Record<any, Object>): void {
    KlaviyoReactNativeSdk.createEvent(name, properties);
  },
};

export { EventProperty, EventType } from './Event';

export type {
  Profile,
  ProfileProperties,
  KlaviyoProfilePropertyType,
  ProfileProperty,
} from './Profile';
