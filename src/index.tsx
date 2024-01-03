import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import type { Spec } from './NativeKlaviyoReactNativeSdk';
import { type KlaviyoProfilePropertyType, type Profile } from './Profile';
import type { Events } from './Event';
export const Klaviyo: Spec = {
  initialize(apiKey: String): void {
    KlaviyoReactNativeSdk.initialize(apiKey);
  },

  setProfile(profile: Profile): void {
    KlaviyoReactNativeSdk.setProfile(
      profile.email ?? '',
      profile.phoneNumber ?? '',
      profile.externalId ?? '',
      profile.firstName ?? '',
      profile.lastName ?? '',
      profile.organization ?? '',
      profile.title ?? '',
      profile.image ?? '',
      profile.location?.address1 ?? '',
      profile.location?.address2 ?? '',
      profile.location?.city ?? '',
      profile.location?.country ?? '',
      profile.location?.latitude ?? 0,
      profile.location?.longitude ?? 0,
      profile.location?.region ?? '',
      profile.location?.zip ?? '',
      profile.location?.timezone ?? '',
      profile.properties ?? {}
    );
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

  createEvent(event: Events): void {
    KlaviyoReactNativeSdk.createEvent(event);
  },
};

export type { EventProperty, Events } from './Event';
export { EventName } from './Event';
export type {
  Profile,
  ProfileProperties,
  KlaviyoProfilePropertyType,
  ProfileProperty,
} from './Profile';
