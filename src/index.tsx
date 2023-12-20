import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import { EventType, type KlaviyoEventAPI } from './Event';

interface IKlaviyo extends KlaviyoEventAPI {
  readonly initialize: (apiKey: String) => void;

  readonly setProfile: (profile: Object) => void;
  readonly setProfileAttribute: (propertyKey: String, value: String) => void;
  readonly setEmail: (email: String) => void;
  readonly setExternalId: (externalId: String) => void;
  readonly setPhoneNumber: (phoneNumber: String) => void;
  readonly setPushToken: (pushToken: String) => void;

  readonly resetProfile: () => void;

  readonly getEmail: () => String | null;
  readonly getExternalId: () => String | null;
  readonly getPhoneNumber: () => String | null;
  readonly getPushToken: () => String | null;
}

export const Klaviyo: IKlaviyo = {
  initialize(apiKey: String): void {
    KlaviyoReactNativeSdk.initialize(apiKey);
  },

  setProfile(profile: Object): void {
    KlaviyoReactNativeSdk.setProfile(profile);
  },

  setProfileAttribute(propertyKey: String, value: String): void {
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
    this.createCustomEvent(name, properties);
  },

  createCustomEvent(name: string, properties?: Record<any, Object>): void {
    KlaviyoReactNativeSdk.createEvent(name, properties);
  },
};

export { EventProperty, EventType } from './Event';
