import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import type { KlaviyoInterface } from './Klaviyo';
import {
  type ProfilePropertyKey,
  type Profile,
  formatProfile,
} from './Profile';
import type { Event } from './Event';
import type { FormConfiguration } from './Forms';
import type { Geofence } from './Geofencing';

const FORMS_UNAVAILABLE_MESSAGE =
  'Klaviyo In-App Forms is not available. The KlaviyoForms module was not included in this build.';
const LOCATION_UNAVAILABLE_MESSAGE =
  'Klaviyo Location (geofencing) is not available. The KlaviyoLocation module was not included in this build.';

function requireFormsAvailable(): void {
  const constants = KlaviyoReactNativeSdk.getConstants?.() ?? {};
  if (constants.FORMS_AVAILABLE === false) {
    console.error(`[Klaviyo] ${FORMS_UNAVAILABLE_MESSAGE}`);
    throw new Error(FORMS_UNAVAILABLE_MESSAGE);
  }
}

function requireLocationAvailable(): void {
  const constants = KlaviyoReactNativeSdk.getConstants?.() ?? {};
  if (constants.LOCATION_AVAILABLE === false) {
    console.error(`[Klaviyo] ${LOCATION_UNAVAILABLE_MESSAGE}`);
    throw new Error(LOCATION_UNAVAILABLE_MESSAGE);
  }
}

/**
 * Implementation of the {@link KlaviyoInterface}
 */
export const Klaviyo: KlaviyoInterface = {
  initialize(apiKey: string): void {
    KlaviyoReactNativeSdk.initialize(apiKey);
  },
  setProfile(profile: Profile): void {
    KlaviyoReactNativeSdk.setProfile(formatProfile(profile));
  },
  setExternalId(externalId: string): void {
    KlaviyoReactNativeSdk.setExternalId(externalId);
  },
  getExternalId(callback: Function | undefined): string | null {
    return KlaviyoReactNativeSdk.getExternalId(callback);
  },
  setEmail(email: string): void {
    KlaviyoReactNativeSdk.setEmail(email);
  },
  getEmail(callback: Function | undefined): string | null {
    return KlaviyoReactNativeSdk.getEmail(callback);
  },
  setPhoneNumber(phoneNumber: string): void {
    KlaviyoReactNativeSdk.setPhoneNumber(phoneNumber);
  },
  getPhoneNumber(callback: Function | undefined): string | null {
    return KlaviyoReactNativeSdk.getPhoneNumber(callback);
  },
  setProfileAttribute(propertyKey: ProfilePropertyKey, value: string): void {
    KlaviyoReactNativeSdk.setProfileAttribute(propertyKey, value);
  },
  setBadgeCount(count: number): void {
    // checking if method exists since this is iOS only and don't want a
    // runtime error on android
    if (KlaviyoReactNativeSdk.setBadgeCount) {
      KlaviyoReactNativeSdk.setBadgeCount(count);
    } else {
      console.log('setBadgeCount is not available on this platform');
    }
  },
  resetProfile(): void {
    KlaviyoReactNativeSdk.resetProfile();
  },
  setPushToken(token: string) {
    KlaviyoReactNativeSdk.setPushToken(token);
  },
  getPushToken(callback: Function | undefined): string | null {
    return KlaviyoReactNativeSdk.getPushToken(callback);
  },
  createEvent(event: Event): void {
    KlaviyoReactNativeSdk.createEvent(event);
  },
  registerForInAppForms(configuration?: FormConfiguration): void {
    requireFormsAvailable();
    KlaviyoReactNativeSdk.registerForInAppForms(configuration);
  },
  unregisterFromInAppForms: () => {
    requireFormsAvailable();
    KlaviyoReactNativeSdk.unregisterFromInAppForms();
  },
  registerGeofencing(): void {
    requireLocationAvailable();
    KlaviyoReactNativeSdk.registerGeofencing();
  },
  unregisterGeofencing(): void {
    requireLocationAvailable();
    KlaviyoReactNativeSdk.unregisterGeofencing();
  },
  getCurrentGeofences(
    callback: (result: { geofences: Geofence[] }) => void
  ): void {
    requireLocationAvailable();
    KlaviyoReactNativeSdk.getCurrentGeofences(callback);
  },
  /**
   * Resolves a Klaviyo tracking link to a Universal Link URL,
   * then handles navigation to the resolved URL.
   * @param urlStr - The tracking link to be handled
   */
  handleUniversalTrackingLink(urlStr: string | null): boolean {
    if (!urlStr || urlStr.trim() === '') {
      console.error('[Klaviyo] Error: Empty tracking link provided');
      return false;
    }

    // Validate that the URL is a Klaviyo universal tracking link using regex
    // Pattern: https://domain/u/path
    const klaviyoTrackingLinkPattern = /^https:\/\/[^/]+\/u\/.*$/;

    if (!klaviyoTrackingLinkPattern.test(urlStr)) {
      console.warn('[Klaviyo] Warning: Not a Klaviyo tracking link');
      return false;
    }

    KlaviyoReactNativeSdk.handleUniversalTrackingLink(urlStr);
    return true;
  },
};

export { type Event, type EventProperties, EventName } from './Event';
export {
  type Profile,
  type ProfileProperties,
  type ProfilePropertyKey,
  type Location,
  ProfileProperty,
} from './Profile';
export type { KlaviyoInterface } from './Klaviyo';
export type { FormConfiguration } from './Forms';
export type { KlaviyoDeepLinkAPI } from './KlaviyoDeepLinkAPI';
export type { Geofence } from './Geofencing';
