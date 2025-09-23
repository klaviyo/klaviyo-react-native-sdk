import { NativeEventEmitter } from 'react-native';
import {
  KlaviyoReactNativeSdk,
  KlaviyoDeepLinkEventEmitter,
} from './KlaviyoReactNativeSdk';
import type { KlaviyoInterface } from './Klaviyo';
import {
  type ProfilePropertyKey,
  type Profile,
  formatProfile,
} from './Profile';
import type { Event } from './Event';
import type { FormConfiguration } from './Forms';
import type { DeepLinkHandler } from './KlaviyoDeepLinkAPI';

// Deep link event management
let deepLinkEventEmitter: NativeEventEmitter | null = null;
let deepLinkSubscription: any = null;

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
    KlaviyoReactNativeSdk.registerForInAppForms(configuration);
  },
  unregisterFromInAppForms: () => {
    KlaviyoReactNativeSdk.unregisterFromInAppForms();
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
  registerDeepLinkHandler(handler: DeepLinkHandler): void {
    // Initialize the event emitter if not already done
    if (!deepLinkEventEmitter) {
      deepLinkEventEmitter = new NativeEventEmitter(
        KlaviyoDeepLinkEventEmitter
      );
    }

    // Remove existing subscription if any
    if (deepLinkSubscription) {
      deepLinkSubscription.remove();
    }

    // Subscribe to deep link events
    deepLinkSubscription = deepLinkEventEmitter.addListener(
      'klaviyoDeepLink',
      (event: { url: string }) => {
        handler(event.url);
      }
    );

    // Register the handler in the native layer
    KlaviyoDeepLinkEventEmitter.registerDeepLinkHandler();
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
export type { DeepLinkHandler, KlaviyoDeepLinkAPI } from './KlaviyoDeepLinkAPI';
