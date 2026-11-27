import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import type { KlaviyoInterface } from './Klaviyo';
import {
  type ProfilePropertyKey,
  type Profile,
  formatProfile,
} from './Profile';
import type { Event } from './Event';
import type { FormConfiguration, FormLifecycleHandler } from './Forms';
import { parseFormLifecycleEvent } from './Forms';
import type { Geofence } from './Geofencing';
import type { AuthTokenProvider } from './AuthToken';
import {
  AUTH_TOKEN_REQUESTED_EVENT,
  classifyProviderError,
  parseAuthTokenRequestedEvent,
} from './AuthToken';
import {
  type Subscription,
  formatSubscription,
  validateSubscription,
} from './Subscription';
import {
  type InboxChangeHandler,
  type InboxFilter,
  type InboxPage,
  type InboxPageOptions,
  type InboxMessageState,
  INBOX_CHANGED_EVENT,
  InboxError,
  InboxErrorCode,
  clampInboxPageSize,
  parseInboxPage,
  toInboxError,
  validateInboxFilterUpdate,
  validateInboxIdsUpdate,
  validateInboxPageOptions,
  validateInboxStateUpdate,
} from './Inbox';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { isNonEmptyString } from './validation';

const FORMS_UNAVAILABLE_MESSAGE =
  'Klaviyo In-App Forms is not available. The KlaviyoForms module was not included in this build. ' +
  'To enable forms, ensure KLAVIYO_INCLUDE_FORMS is not set to "false" in your Podfile (iOS) ' +
  'and klaviyoIncludeForms is not set to false in gradle.properties (Android).';
const LOCATION_UNAVAILABLE_MESSAGE =
  'Klaviyo Location (geofencing) is not available. The KlaviyoLocation module was not included in this build. ' +
  'To enable location, ensure KLAVIYO_INCLUDE_LOCATION is not set to "false" in your Podfile (iOS) ' +
  'and klaviyoIncludeLocation is not set to false in gradle.properties (Android).';
const INBOX_UNAVAILABLE_MESSAGE =
  'Klaviyo Mobile Inbox is not available. The native Inbox module was not included in this build. ' +
  'To enable the inbox, ensure KLAVIYO_INCLUDE_INBOX is set to "true" in your Podfile (iOS) ' +
  'and klaviyoIncludeInbox is set to true in gradle.properties (Android).';

function isFormsAvailable(): boolean {
  const constants = KlaviyoReactNativeSdk.getConstants?.() ?? {};
  if (constants.FORMS_AVAILABLE === false) {
    console.error(`[Klaviyo] ${FORMS_UNAVAILABLE_MESSAGE}`);
    return false;
  }
  return true;
}

function isLocationAvailable(): boolean {
  const constants = KlaviyoReactNativeSdk.getConstants?.() ?? {};
  if (constants.LOCATION_AVAILABLE === false) {
    console.error(`[Klaviyo] ${LOCATION_UNAVAILABLE_MESSAGE}`);
    return false;
  }
  return true;
}

/**
 * Whether the native Inbox module is linked into this build.
 *
 * Unlike Forms and Location, which are included by default, Inbox is not, so it is opt-in and only
 * available when `INBOX_AVAILABLE` is `true`.
 */
function isInboxAvailable(): boolean {
  const constants = KlaviyoReactNativeSdk.getConstants?.() ?? {};
  if (constants.INBOX_AVAILABLE !== true) {
    console.error(`[Klaviyo] ${INBOX_UNAVAILABLE_MESSAGE}`);
    return false;
  }
  return true;
}

// Track active lifecycle subscription to prevent duplicate listeners
let activeLifecycleSubscription: { remove: () => void } | null = null;

// Track active auth token request subscription to prevent duplicate listeners
let activeAuthTokenSubscription: { remove: () => void } | null = null;

// The currently-registered provider. Captured so an in-flight provider() call
// that resolves after unregister/re-register (e.g. logout) can be detected and
// its now-stale result dropped rather than delivered to native.
let activeAuthTokenProvider: AuthTokenProvider | null = null;

/**
 * Live inbox change handlers.
 *
 * One native listener backs every subscriber, and it is attached on the first
 * `subscribe` and torn down when the last one unsubscribes — so an app that
 * never uses the inbox never asks native to watch for changes, and one that
 * does pays for a single bridge listener regardless of how many components
 * listen.
 */
const inboxChangeHandlers = new Map<InboxChangeHandler, object>();

// The single NativeEventEmitter subscription backing `inboxChangeHandlers`.
let inboxChangeSubscription: { remove: () => void } | null = null;

/**
 * Implementation of the {@link KlaviyoInterface}
 */
export const Klaviyo: KlaviyoInterface = {
  initialize(apiKey: string): void {
    KlaviyoReactNativeSdk.initialize(apiKey);
  },
  setLoggingEnabled(enabled: boolean): void {
    KlaviyoReactNativeSdk.setLoggingEnabled(enabled);
  },
  isLoggingEnabled(callback: (enabled: boolean) => void): void {
    KlaviyoReactNativeSdk.isLoggingEnabled(callback);
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
  createSubscription(subscription: Subscription): void {
    // Validate the whole shape up front: TypeScript can't police plain-JS callers, and reporting
    // here beats throwing mid-marshalling or handing native a malformed payload.
    const error = validateSubscription(subscription);
    if (error !== null) {
      console.error(`[Klaviyo] Error: ${error}`);
      return;
    }
    KlaviyoReactNativeSdk.createSubscription(formatSubscription(subscription));
  },
  registerForInAppForms(configuration?: FormConfiguration): void {
    if (!isFormsAvailable()) return;
    KlaviyoReactNativeSdk.registerForInAppForms(configuration);
  },
  unregisterFromInAppForms(): void {
    if (!isFormsAvailable()) return;
    KlaviyoReactNativeSdk.unregisterFromInAppForms();
  },
  startFormsPreview(token: string): void {
    if (!isFormsAvailable()) return;
    KlaviyoReactNativeSdk.startFormsPreview(token);
  },
  endFormsPreview(): void {
    if (!isFormsAvailable()) return;
    KlaviyoReactNativeSdk.endFormsPreview();
  },
  async handleFormsPreviewLink(url: string | null): Promise<boolean> {
    if (!url) return false;
    if (!isFormsAvailable()) return false;
    try {
      return await KlaviyoReactNativeSdk.handleFormsPreviewLink(url);
    } catch {
      return false;
    }
  },
  registerGeofencing(): void {
    if (!isLocationAvailable()) return;
    KlaviyoReactNativeSdk.registerGeofencing();
  },
  unregisterGeofencing(): void {
    if (!isLocationAvailable()) return;
    KlaviyoReactNativeSdk.unregisterGeofencing();
  },
  getCurrentGeofences(
    callback: (result: { geofences: Geofence[] }) => void
  ): void {
    if (!isLocationAvailable()) {
      callback({ geofences: [] });
      return;
    }
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
  registerFormLifecycleHandler(handler: FormLifecycleHandler): () => void {
    if (!isFormsAvailable()) return () => {};

    // Clean up any existing subscription before re-registering
    if (activeLifecycleSubscription) {
      activeLifecycleSubscription.remove();
      KlaviyoReactNativeSdk.unregisterFormLifecycleHandler();
      activeLifecycleSubscription = null;
    }

    const eventEmitter = new NativeEventEmitter(
      NativeModules.KlaviyoReactNativeSdk
    );

    activeLifecycleSubscription = eventEmitter.addListener(
      'FormLifecycleEvent',
      (data: Record<string, unknown>) => {
        const event = parseFormLifecycleEvent(data);
        if (event !== null) {
          handler(event);
        }
      }
    );

    KlaviyoReactNativeSdk.registerFormLifecycleHandler();

    return () => {
      activeLifecycleSubscription?.remove();
      activeLifecycleSubscription = null;
      KlaviyoReactNativeSdk.unregisterFormLifecycleHandler();
    };
  },
  registerAuthTokenProvider(provider: AuthTokenProvider): void {
    // Clean up any existing subscription before re-registering so the new
    // provider replaces the previous one. Mirror the native teardown done on
    // re-registration for form lifecycle handlers: also unregister on the
    // native side so pending token requests are drained and a prior provider's
    // in-flight handler can't resolve a stale request.
    if (activeAuthTokenSubscription) {
      activeAuthTokenSubscription.remove();
      KlaviyoReactNativeSdk.unregisterAuthTokenProvider();
      activeAuthTokenSubscription = null;
    }

    activeAuthTokenProvider = provider;

    const eventEmitter = new NativeEventEmitter(
      NativeModules.KlaviyoReactNativeSdk
    );

    activeAuthTokenSubscription = eventEmitter.addListener(
      AUTH_TOKEN_REQUESTED_EVENT,
      async (data: Record<string, unknown>) => {
        const event = parseAuthTokenRequestedEvent(data);
        if (event === null) {
          return;
        }

        try {
          const jwt = await provider();
          // If the provider was unregistered or replaced while this fetch was
          // in flight (e.g. logout), drop the result — do not deliver a token
          // acquired for a now-inactive provider. Native already drained this
          // request's continuation on unregister, so no response is owed.
          if (activeAuthTokenProvider !== provider) {
            return;
          }
          if (typeof jwt !== 'string' || jwt.length === 0) {
            // Route an empty / non-string resolution through the failure path
            // so native gets a clear signal rather than a bogus "success".
            throw new Error('Auth token provider resolved without a token');
          }
          // NOTE: never log token contents; native side owns token logging.
          KlaviyoReactNativeSdk.respondToAuthTokenRequest(event.id, { jwt });
        } catch (error) {
          // Same in-flight guard for the rejection path: a late failure for an
          // inactive provider is dropped rather than forwarded.
          if (activeAuthTokenProvider !== provider) {
            return;
          }
          const { message, isConnectivityError } = classifyProviderError(error);
          console.error(
            `[Klaviyo] Auth token provider failed for request ${event.id}: ${message}`
          );
          // Forward the connectivity flag so native can reconstitute a typed
          // network error the SDK's connectivity-driven retry recognizes.
          KlaviyoReactNativeSdk.respondToAuthTokenRequest(event.id, {
            error: message,
            isConnectivityError,
          });
        }
      }
    );

    KlaviyoReactNativeSdk.registerAuthTokenProvider();
  },
  unregisterAuthTokenProvider(): void {
    activeAuthTokenSubscription?.remove();
    activeAuthTokenSubscription = null;
    activeAuthTokenProvider = null;
    KlaviyoReactNativeSdk.unregisterAuthTokenProvider();
  },
  async fetchPage(options?: InboxPageOptions): Promise<InboxPage> {
    if (!isInboxAvailable()) {
      throw new InboxError(
        InboxErrorCode.Unavailable,
        INBOX_UNAVAILABLE_MESSAGE
      );
    }

    // Arguments are validated here because TypeScript can't police plain-JS callers, and because a
    // rejection with a clear message beats a bridge-level marshalling failure.
    const optionsError = validateInboxPageOptions(options);
    if (optionsError !== null) {
      throw new TypeError(`[Klaviyo] ${optionsError}`);
    }

    if (options?.cursor !== undefined && !isNonEmptyString(options.cursor)) {
      // A blank cursor is an inbox condition, not a type error: no page ever returned it.
      throw new InboxError(
        InboxErrorCode.InvalidCursor,
        '[Klaviyo] Inbox cursor must be a non-empty string when provided'
      );
    }

    try {
      return parseInboxPage(
        await KlaviyoReactNativeSdk.fetchInboxPage(
          options
            ? {
                ...options,
                ...(options.pageSize !== undefined && {
                  pageSize: clampInboxPageSize(options.pageSize),
                }),
              }
            : null
        )
      );
    } catch (error) {
      throw toInboxError(error);
    }
  },
  async fetchUnreadCount(): Promise<number> {
    if (!isInboxAvailable()) {
      throw new InboxError(
        InboxErrorCode.Unavailable,
        INBOX_UNAVAILABLE_MESSAGE
      );
    }

    try {
      return await KlaviyoReactNativeSdk.fetchInboxUnreadCount();
    } catch (error) {
      throw toInboxError(error);
    }
  },
  async updateMessageState(
    messageId: string,
    state: InboxMessageState
  ): Promise<boolean> {
    if (!isInboxAvailable()) {
      throw new InboxError(
        InboxErrorCode.Unavailable,
        INBOX_UNAVAILABLE_MESSAGE
      );
    }

    const error = validateInboxStateUpdate(messageId, state);
    if (error !== null) {
      throw new TypeError(`[Klaviyo] ${error}`);
    }

    try {
      return await KlaviyoReactNativeSdk.updateInboxMessageState(
        messageId,
        state
      );
    } catch (nativeError) {
      throw toInboxError(nativeError);
    }
  },
  async updateMessageStates(
    state: InboxMessageState,
    filter: InboxFilter
  ): Promise<number> {
    if (!isInboxAvailable()) {
      throw new InboxError(
        InboxErrorCode.Unavailable,
        INBOX_UNAVAILABLE_MESSAGE
      );
    }

    const error = validateInboxFilterUpdate(state, filter);
    if (error !== null) {
      throw new TypeError(`[Klaviyo] ${error}`);
    }

    try {
      return await KlaviyoReactNativeSdk.updateInboxMessageStates(
        state,
        filter.readFilter,
        filter.archiveFilter
      );
    } catch (nativeError) {
      throw toInboxError(nativeError);
    }
  },
  async updateMessageStatesByIds(
    state: InboxMessageState,
    messageIds: readonly string[]
  ): Promise<number> {
    if (!isInboxAvailable()) {
      throw new InboxError(
        InboxErrorCode.Unavailable,
        INBOX_UNAVAILABLE_MESSAGE
      );
    }

    const error = validateInboxIdsUpdate(state, messageIds);
    if (error !== null) {
      throw new TypeError(`[Klaviyo] ${error}`);
    }

    try {
      return await KlaviyoReactNativeSdk.updateInboxMessageStatesByIds(state, [
        ...messageIds,
      ]);
    } catch (nativeError) {
      throw toInboxError(nativeError);
    }
  },
  async clearAll(): Promise<number> {
    if (!isInboxAvailable()) {
      throw new InboxError(
        InboxErrorCode.Unavailable,
        INBOX_UNAVAILABLE_MESSAGE
      );
    }

    try {
      return await KlaviyoReactNativeSdk.clearInbox();
    } catch (nativeError) {
      throw toInboxError(nativeError);
    }
  },
  subscribe(handler: InboxChangeHandler): () => void {
    if (!isInboxAvailable()) return () => {};

    if (inboxChangeHandlers.size === 0) {
      const eventEmitter = new NativeEventEmitter(
        NativeModules.KlaviyoReactNativeSdk
      );

      // The native event carries no payload: it is an invalidation, not a delta, so nothing is
      // parsed here and a no-argument handler is all that is invoked.
      inboxChangeSubscription = eventEmitter.addListener(
        INBOX_CHANGED_EVENT,
        () => {
          // Snapshot the handlers: one may unsubscribe (or subscribe) while being notified, and a
          // Set being iterated must not be mutated underneath the iteration. A handler that
          // unsubscribes another during this notification must not still reach it, so each is
          // checked against the live set before it is called.
          for (const registered of [...inboxChangeHandlers.keys()]) {
            if (!inboxChangeHandlers.has(registered)) continue;
            try {
              registered();
            } catch (error) {
              // One host handler throwing must not stop the others from being notified, and it
              // must not escape into the bridge's event dispatch.
              console.error('[Klaviyo] Error in inbox change handler:', error);
            }
          }
        }
      );

      // Ask native to start forwarding its change signal.
      KlaviyoReactNativeSdk.registerInboxChangeHandler();
    }

    // Each registration has an identity, shared by repeat subscriptions of the same function. A
    // cleanup only removes the registration it was issued for, so an old handle called after the
    // handler unsubscribed and subscribed again does not remove the new one.
    const registration = inboxChangeHandlers.get(handler) ?? {};
    inboxChangeHandlers.set(handler, registration);

    return () => {
      if (inboxChangeHandlers.get(handler) !== registration) return;
      inboxChangeHandlers.delete(handler);
      if (inboxChangeHandlers.size === 0) {
        inboxChangeSubscription?.remove();
        inboxChangeSubscription = null;
        KlaviyoReactNativeSdk.unregisterInboxChangeHandler();
      }
    };
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
export { FormLifecycleEventType, FORMS_PREVIEW_TOKEN_KEY } from './Forms';
export type {
  FormConfiguration,
  FormLifecycleEvent,
  FormLifecycleHandler,
} from './Forms';
export type { KlaviyoDeepLinkAPI } from './KlaviyoDeepLinkAPI';
export type { Geofence } from './Geofencing';
export type { AuthTokenProvider, KlaviyoAuthTokenApi } from './AuthToken';
export {
  ALL_AVAILABLE_MARKETING,
  EmailConsent,
  MessagingConsent,
  allAvailableMarketing,
} from './Subscription';
export type {
  KlaviyoSubscriptionApi,
  Subscription,
  SubscriptionChannels,
} from './Subscription';
export {
  INBOX_CHANGED_EVENT,
  InboxArchiveFilter,
  InboxError,
  InboxErrorCode,
  InboxFilter,
  InboxReadFilter,
} from './Inbox';
export type {
  InboxAction,
  InboxChangeHandler,
  InboxDestination,
  InboxMessage,
  InboxMessageState,
  InboxPage,
  InboxPageOptions,
  KlaviyoInboxApi,
} from './Inbox';
