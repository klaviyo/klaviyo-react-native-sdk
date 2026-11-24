import { NativeModules } from 'react-native';
import {
  Klaviyo,
  InboxArchiveFilter,
  InboxError,
  InboxErrorCode,
  InboxFilter,
  InboxReadFilter,
} from '../index';
import { EventName, type Event } from '../Event';
import { ProfileProperty } from '../Profile';
import {
  ALL_AVAILABLE_MARKETING,
  EmailConsent,
  MessagingConsent,
  allAvailableMarketing,
} from '../Subscription';

const PREVIEW_TOKEN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123-_6';

// Store event listeners for testing NativeEventEmitter
const eventListeners: Record<string, Array<(data: any) => void>> = {};
const mockRemove = jest.fn();

// Mock the native module
jest.mock('react-native', () => {
  return {
    NativeModules: {
      KlaviyoReactNativeSdk: {
        initialize: jest.fn(),
        setLoggingEnabled: jest.fn(),
        isLoggingEnabled: jest.fn(),
        setProfile: jest.fn(),
        setExternalId: jest.fn(),
        getExternalId: jest.fn(),
        setEmail: jest.fn(),
        getEmail: jest.fn(),
        setPhoneNumber: jest.fn(),
        getPhoneNumber: jest.fn(),
        setProfileAttribute: jest.fn(),
        setBadgeCount: jest.fn(),
        resetProfile: jest.fn(),
        setPushToken: jest.fn(),
        getPushToken: jest.fn(),
        createEvent: jest.fn(),
        createSubscription: jest.fn(),
        registerForInAppForms: jest.fn(),
        unregisterFromInAppForms: jest.fn(),
        startFormsPreview: jest.fn(),
        endFormsPreview: jest.fn(),
        handleFormsPreviewLink: jest.fn(),
        registerFormLifecycleHandler: jest.fn(),
        unregisterFormLifecycleHandler: jest.fn(),
        registerAuthTokenProvider: jest.fn(),
        unregisterAuthTokenProvider: jest.fn(),
        respondToAuthTokenRequest: jest.fn(),
        registerGeofencing: jest.fn(),
        unregisterGeofencing: jest.fn(),
        getCurrentGeofences: jest.fn(),
        handleUniversalTrackingLink: jest.fn(),
        fetchInboxPage: jest.fn(),
        fetchInboxUnreadCount: jest.fn(),
        updateInboxMessageState: jest.fn(),
        updateInboxMessageStates: jest.fn(),
        registerInboxChangeHandler: jest.fn(),
        unregisterInboxChangeHandler: jest.fn(),
        getConstants: jest.fn().mockReturnValue({
          PROFILE_KEYS: {
            FIRST_NAME: 'first_name',
            LAST_NAME: 'last_name',
            TITLE: 'title',
            ORGANIZATION: 'organization',
            IMAGE: 'image',
            ADDRESS1: 'address1',
            ADDRESS2: 'address2',
            CITY: 'city',
            COUNTRY: 'country',
            ZIP: 'zip',
            REGION: 'region',
            LATITUDE: 'latitude',
            LONGITUDE: 'longitude',
            TIMEZONE: 'timezone',
            LOCATION: 'location',
            PROPERTIES: 'properties',
            EXTERNAL_ID: 'external_id',
            EMAIL: 'email',
            PHONE_NUMBER: 'phone_number',
          },
          EVENT_NAMES: {
            ADDED_TO_CART: 'Added to Cart',
            OPENED_APP: 'Opened App',
            STARTED_CHECKOUT: 'Started Checkout',
            VIEWED_PRODUCT: 'Viewed Product',
          },
          FORMS_AVAILABLE: true,
          LOCATION_AVAILABLE: true,
          INBOX_AVAILABLE: true,
        }),
      },
    },
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
      addListener: jest.fn().mockImplementation((eventName, callback) => {
        if (!eventListeners[eventName]) {
          eventListeners[eventName] = [];
        }
        eventListeners[eventName]!.push(callback);
        // `remove` both bumps the spy (so existing tests that assert
        // `mockRemove.toHaveBeenCalled*` keep working) and actually splices
        // the callback out of `eventListeners` so subsequent
        // `emitNativeEvent` calls don't reach detached listeners.
        const remove = () => {
          mockRemove();
          const arr = eventListeners[eventName];
          if (arr) {
            const idx = arr.indexOf(callback);
            if (idx >= 0) arr.splice(idx, 1);
          }
        };
        return { remove };
      }),
    })),
    Platform: {
      select: jest.fn().mockImplementation((obj) => obj.ios),
    },
  };
});

// Helper to simulate native event emission. `data` is optional because an invalidation event
// carries no payload.
function emitNativeEvent(eventName: string, data?: any) {
  eventListeners[eventName]?.forEach((listener) => listener(data));
}

describe('Klaviyo SDK', () => {
  beforeEach(() => {
    // Clear all mocks and event listeners before each test
    jest.clearAllMocks();
    Object.keys(eventListeners).forEach((key) => delete eventListeners[key]);
  });

  describe('initialization', () => {
    it('should call the native initialize method with the provided API key', () => {
      const apiKey = 'test_api_key_123';
      Klaviyo.initialize(apiKey);

      expect(
        NativeModules.KlaviyoReactNativeSdk.initialize
      ).toHaveBeenCalledWith(apiKey);
      expect(
        NativeModules.KlaviyoReactNativeSdk.initialize
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('SDK logging', () => {
    it('should call the native setLoggingEnabled method with the provided value', () => {
      Klaviyo.setLoggingEnabled(false);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setLoggingEnabled
      ).toHaveBeenCalledWith(false);

      Klaviyo.setLoggingEnabled(true);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setLoggingEnabled
      ).toHaveBeenCalledWith(true);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setLoggingEnabled
      ).toHaveBeenCalledTimes(2);
    });

    it('should get logging state through callback correctly', () => {
      const callback = jest.fn();
      Klaviyo.isLoggingEnabled(callback);

      // Simulate the native callback invocation
      const isLoggingEnabledCall =
        NativeModules.KlaviyoReactNativeSdk.isLoggingEnabled.mock.calls[0][0];
      isLoggingEnabledCall(true);

      expect(
        NativeModules.KlaviyoReactNativeSdk.isLoggingEnabled
      ).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  describe('profile management', () => {
    it('should set profile data correctly', () => {
      const profile = {
        email: 'test@example.com',
        phoneNumber: '5551234567',
        externalId: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        organization: 'Test Co',
        title: 'Developer',
        image: 'https://example.com/image.jpg',
        location: {
          address1: '123 Main St',
          address2: 'Apt 4B',
          city: 'Boston',
          country: 'USA',
          region: 'MA',
          zip: '02108',
        },
        properties: {
          customProp1: 'value1',
          customProp2: 'value2',
        },
      };

      Klaviyo.setProfile(profile);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setProfile
      ).toHaveBeenCalledTimes(1);
    });

    it('should set and get external ID through callback correctly', () => {
      const externalId = 'user_123';

      // Set the external ID
      Klaviyo.setExternalId(externalId);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setExternalId
      ).toHaveBeenCalledWith(externalId);

      // Test the getter with callback
      Klaviyo.getExternalId((value: string) => {
        expect(value).toBe(externalId);
      });

      // Simulate callback invocation
      const getExternalIdCall =
        NativeModules.KlaviyoReactNativeSdk.getExternalId.mock.calls[0][0];
      getExternalIdCall(externalId);

      expect(
        NativeModules.KlaviyoReactNativeSdk.getExternalId
      ).toHaveBeenCalled();
    });

    it('should set and get phone number through callback correctly', () => {
      const phoneNumber = '5551234567';

      // Set the phone number
      Klaviyo.setPhoneNumber(phoneNumber);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setPhoneNumber
      ).toHaveBeenCalledWith(phoneNumber);

      // Test the getter with callback
      Klaviyo.getPhoneNumber((value: string) => {
        expect(value).toBe(phoneNumber);
      });

      // Simulate callback invocation
      const getPhoneNumberCall =
        NativeModules.KlaviyoReactNativeSdk.getPhoneNumber.mock.calls[0][0];
      getPhoneNumberCall(phoneNumber);

      expect(
        NativeModules.KlaviyoReactNativeSdk.getPhoneNumber
      ).toHaveBeenCalled();
    });

    it('should set email correctly', () => {
      const email = 'user@example.com';

      Klaviyo.setEmail(email);
      expect(NativeModules.KlaviyoReactNativeSdk.setEmail).toHaveBeenCalledWith(
        email
      );
    });

    it('should get email through callback correctly', () => {
      const email = 'user@example.com';

      // Test with callback
      Klaviyo.getEmail((value: string) => {
        expect(value).toBe(email);
      });

      // Simulate callback invocation
      const getEmailCall =
        NativeModules.KlaviyoReactNativeSdk.getEmail.mock.calls[0][0];
      getEmailCall(email);

      expect(NativeModules.KlaviyoReactNativeSdk.getEmail).toHaveBeenCalled();
    });

    it('should set profile attribute correctly', () => {
      const key = ProfileProperty.FIRST_NAME;
      const value = 'Jane';

      Klaviyo.setProfileAttribute(key, value);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setProfileAttribute
      ).toHaveBeenCalledWith(key, value);
    });
  });

  describe('event tracking', () => {
    it('should create an event correctly', () => {
      const event = {
        name: EventName.ADDED_TO_CART_METRIC,
        properties: {
          productId: '12345',
          productName: 'Test Product',
          price: 99.99,
        },
        value: 99.99,
      };

      Klaviyo.createEvent(event);
      expect(
        NativeModules.KlaviyoReactNativeSdk.createEvent
      ).toHaveBeenCalledWith(event);
    });

    it('should pass valueCurrency through to the native module', () => {
      const event: Event = {
        name: EventName.STARTED_CHECKOUT_METRIC,
        value: 10,
        valueCurrency: 'EUR',
      };

      Klaviyo.createEvent(event);
      expect(
        NativeModules.KlaviyoReactNativeSdk.createEvent
      ).toHaveBeenCalledWith({
        name: EventName.STARTED_CHECKOUT_METRIC,
        value: 10,
        valueCurrency: 'EUR',
      });
    });
  });

  describe('push notifications', () => {
    it('should set push token correctly', () => {
      const token = 'device_push_token_123';

      Klaviyo.setPushToken(token);
      expect(
        NativeModules.KlaviyoReactNativeSdk.setPushToken
      ).toHaveBeenCalledWith(token);
    });

    it('should get push token through callback correctly', () => {
      const token = 'device_push_token_123';

      // Test with callback
      Klaviyo.getPushToken((value: string) => {
        expect(value).toBe(token);
      });

      // Simulate callback invocation
      const getPushTokenCall =
        NativeModules.KlaviyoReactNativeSdk.getPushToken.mock.calls[0][0];
      getPushTokenCall(token);

      expect(
        NativeModules.KlaviyoReactNativeSdk.getPushToken
      ).toHaveBeenCalled();
    });
  });

  describe('in-app forms', () => {
    it('should register for in-app forms with configuration', () => {
      const config = {
        sessionTimeoutDuration: 3600,
      };

      Klaviyo.registerForInAppForms(config);
      expect(
        NativeModules.KlaviyoReactNativeSdk.registerForInAppForms
      ).toHaveBeenCalledWith(config);
    });

    it('starts and ends a forms preview', () => {
      Klaviyo.startFormsPreview(PREVIEW_TOKEN);
      Klaviyo.endFormsPreview();
      expect(
        NativeModules.KlaviyoReactNativeSdk.startFormsPreview
      ).toHaveBeenCalledWith(PREVIEW_TOKEN);
      expect(
        NativeModules.KlaviyoReactNativeSdk.endFormsPreview
      ).toHaveBeenCalledTimes(1);
    });

    describe('handleFormsPreviewLink', () => {
      it('resolves true when the native SDK starts a preview', async () => {
        NativeModules.KlaviyoReactNativeSdk.handleFormsPreviewLink.mockResolvedValue(
          true
        );
        const url = `myapp://home?klaviyo-forms-preview=${PREVIEW_TOKEN}`;
        await expect(Klaviyo.handleFormsPreviewLink(url)).resolves.toBe(true);
        expect(
          NativeModules.KlaviyoReactNativeSdk.handleFormsPreviewLink
        ).toHaveBeenCalledWith(url);
      });

      it('resolves false when the native SDK does not start a preview', async () => {
        NativeModules.KlaviyoReactNativeSdk.handleFormsPreviewLink.mockResolvedValue(
          false
        );
        await expect(
          Klaviyo.handleFormsPreviewLink('myapp://home')
        ).resolves.toBe(false);
      });

      it('resolves false when the native call rejects or throws', async () => {
        NativeModules.KlaviyoReactNativeSdk.handleFormsPreviewLink.mockRejectedValue(
          new Error('bridge error')
        );
        await expect(
          Klaviyo.handleFormsPreviewLink('myapp://home')
        ).resolves.toBe(false);
        NativeModules.KlaviyoReactNativeSdk.handleFormsPreviewLink.mockImplementation(
          () => {
            throw new Error('sync throw');
          }
        );
        await expect(
          Klaviyo.handleFormsPreviewLink('myapp://home')
        ).resolves.toBe(false);
      });

      it('resolves false for a null or empty link without calling native', async () => {
        await expect(Klaviyo.handleFormsPreviewLink(null)).resolves.toBe(false);
        await expect(Klaviyo.handleFormsPreviewLink('')).resolves.toBe(false);
        expect(
          NativeModules.KlaviyoReactNativeSdk.handleFormsPreviewLink
        ).not.toHaveBeenCalled();
      });

      it('does not reject before initialize', async () => {
        NativeModules.KlaviyoReactNativeSdk.handleFormsPreviewLink.mockResolvedValue(
          true
        );
        await expect(
          Klaviyo.handleFormsPreviewLink(
            `myapp://home?klaviyo-forms-preview=${PREVIEW_TOKEN}`
          )
        ).resolves.toBe(true);
      });
    });

    it('should unregister from in-app forms', () => {
      Klaviyo.unregisterFromInAppForms();
      expect(
        NativeModules.KlaviyoReactNativeSdk.unregisterFromInAppForms
      ).toHaveBeenCalled();
    });

    it('logs error and noops when KlaviyoForms module is not available', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const defaultConstants =
        NativeModules.KlaviyoReactNativeSdk.getConstants();
      NativeModules.KlaviyoReactNativeSdk.getConstants.mockReturnValue({
        ...defaultConstants,
        FORMS_AVAILABLE: false,
      });

      try {
        Klaviyo.registerForInAppForms();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('KlaviyoForms')
        );
        expect(
          NativeModules.KlaviyoReactNativeSdk.registerForInAppForms
        ).not.toHaveBeenCalled();

        consoleErrorSpy.mockClear();

        Klaviyo.unregisterFromInAppForms();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('KlaviyoForms')
        );
        expect(
          NativeModules.KlaviyoReactNativeSdk.unregisterFromInAppForms
        ).not.toHaveBeenCalled();
      } finally {
        NativeModules.KlaviyoReactNativeSdk.getConstants.mockReturnValue(
          defaultConstants
        );
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('geofencing', () => {
    it('should register for geofencing', () => {
      Klaviyo.registerGeofencing();
      expect(
        NativeModules.KlaviyoReactNativeSdk.registerGeofencing
      ).toHaveBeenCalledTimes(1);
    });

    it('should unregister from geofencing', () => {
      Klaviyo.unregisterGeofencing();
      expect(
        NativeModules.KlaviyoReactNativeSdk.unregisterGeofencing
      ).toHaveBeenCalledTimes(1);
    });

    it('should get current geofences through callback correctly', () => {
      const mockGeofences = {
        geofences: [
          {
            identifier: 'geofence_1',
            latitude: 42.3601,
            longitude: -71.0589,
            radius: 100,
          },
          {
            identifier: 'geofence_2',
            latitude: 40.7128,
            longitude: -74.006,
            radius: 200,
          },
        ],
      };

      // Test with callback
      Klaviyo.getCurrentGeofences((result) => {
        expect(result).toEqual(mockGeofences);
      });

      // Simulate callback invocation
      const getCurrentGeofencesCall =
        NativeModules.KlaviyoReactNativeSdk.getCurrentGeofences.mock
          .calls[0][0];
      getCurrentGeofencesCall(mockGeofences);

      expect(
        NativeModules.KlaviyoReactNativeSdk.getCurrentGeofences
      ).toHaveBeenCalled();
    });

    it('logs error and noops when KlaviyoLocation module is not available', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const defaultConstants =
        NativeModules.KlaviyoReactNativeSdk.getConstants();
      NativeModules.KlaviyoReactNativeSdk.getConstants.mockReturnValue({
        ...defaultConstants,
        LOCATION_AVAILABLE: false,
      });

      try {
        Klaviyo.registerGeofencing();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('KlaviyoLocation')
        );
        expect(
          NativeModules.KlaviyoReactNativeSdk.registerGeofencing
        ).not.toHaveBeenCalled();

        consoleErrorSpy.mockClear();

        Klaviyo.unregisterGeofencing();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('KlaviyoLocation')
        );
        expect(
          NativeModules.KlaviyoReactNativeSdk.unregisterGeofencing
        ).not.toHaveBeenCalled();

        consoleErrorSpy.mockClear();

        Klaviyo.getCurrentGeofences(() => {});
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('KlaviyoLocation')
        );
        expect(
          NativeModules.KlaviyoReactNativeSdk.getCurrentGeofences
        ).not.toHaveBeenCalled();
      } finally {
        NativeModules.KlaviyoReactNativeSdk.getConstants.mockReturnValue(
          defaultConstants
        );
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('tracking links', () => {
    it('should call the native handleUniversalTrackingLink method with a valid Klaviyo universal tracking link', () => {
      const trackingLink = 'https://klaviyo.com/u/abc123';

      const result = Klaviyo.handleUniversalTrackingLink(trackingLink);
      expect(result).toBe(true);
      expect(
        NativeModules.KlaviyoReactNativeSdk.handleUniversalTrackingLink
      ).toHaveBeenCalledWith(trackingLink);
      expect(
        NativeModules.KlaviyoReactNativeSdk.handleUniversalTrackingLink
      ).toHaveBeenCalledTimes(1);
    });

    it('should not call the native handleUniversalTrackingLink method with an empty URL', () => {
      // Create spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = Klaviyo.handleUniversalTrackingLink('');
      expect(result).toBe(false);
      expect(
        NativeModules.KlaviyoReactNativeSdk.handleUniversalTrackingLink
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Klaviyo] Error: Empty tracking link provided'
      );

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should not call the native handleUniversalTrackingLink method with a null URL', () => {
      // Create spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // @ts-ignore - intentionally testing invalid input
      const result = Klaviyo.handleUniversalTrackingLink(null);
      expect(result).toBe(false);
      expect(
        NativeModules.KlaviyoReactNativeSdk.handleUniversalTrackingLink
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Klaviyo] Error: Empty tracking link provided'
      );

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should not call the native handleUniversalTrackingLink method with an invalid URL format', () => {
      // Create spy on console.warn since regex validation now uses warning instead of error
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = Klaviyo.handleUniversalTrackingLink('not-a-valid-url');
      expect(result).toBe(false);
      expect(
        NativeModules.KlaviyoReactNativeSdk.handleUniversalTrackingLink
      ).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Klaviyo] Warning: Not a Klaviyo tracking link'
      );

      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });

    it('should not call the native handleUniversalTrackingLink method with a non-HTTPS URL', () => {
      // Create spy on console.error
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = Klaviyo.handleUniversalTrackingLink(
        'http://klaviyo.com/u/abc123'
      );
      expect(result).toBe(false);
      expect(
        NativeModules.KlaviyoReactNativeSdk.handleUniversalTrackingLink
      ).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Klaviyo] Warning: Not a Klaviyo tracking link'
      );

      // Restore console.error
      consoleWarnSpy.mockRestore();
    });

    it('should not call the native handleUniversalTrackingLink method with a URL that does not have a /u/ path', () => {
      // Create spy on console.error
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = Klaviyo.handleUniversalTrackingLink(
        'https://klaviyo.com/track/abc123'
      );
      expect(result).toBe(false);
      expect(
        NativeModules.KlaviyoReactNativeSdk.handleUniversalTrackingLink
      ).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Klaviyo] Warning: Not a Klaviyo tracking link'
      );

      // Restore console.error
      consoleWarnSpy.mockRestore();
    });
  });

  describe('form lifecycle events', () => {
    it('should register native handler and forward formShown events', () => {
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      expect(
        NativeModules.KlaviyoReactNativeSdk.registerFormLifecycleHandler
      ).toHaveBeenCalledTimes(1);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formShown',
        formId: 'abc123',
        formName: 'Test Form',
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'formShown',
        formId: 'abc123',
        formName: 'Test Form',
      });
    });

    it('should forward formDismissed events', () => {
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formDismissed',
        formId: 'abc123',
        formName: 'Test Form',
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'formDismissed',
        formId: 'abc123',
        formName: 'Test Form',
      });
    });

    it('should forward formCtaClicked events with buttonLabel and deepLinkUrl', () => {
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Test Form',
        buttonLabel: 'Shop Now',
        deepLinkUrl: 'myapp://products',
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Test Form',
        buttonLabel: 'Shop Now',
        deepLinkUrl: 'myapp://products',
      });
    });

    it('should unsubscribe from events when cleanup function is called', () => {
      const handler = jest.fn();
      const unsubscribe = Klaviyo.registerFormLifecycleHandler(handler);

      // Clear any calls from re-registration cleanup of prior tests
      mockRemove.mockClear();
      (
        NativeModules.KlaviyoReactNativeSdk
          .unregisterFormLifecycleHandler as jest.Mock
      ).mockClear();

      unsubscribe();

      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(
        NativeModules.KlaviyoReactNativeSdk.unregisterFormLifecycleHandler
      ).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call the unsubscribe function more than once', () => {
      const handler = jest.fn();
      const unsubscribe = Klaviyo.registerFormLifecycleHandler(handler);

      // Calling unsubscribe twice should not throw, and the handler should
      // remain unregistered. Behavioral check only — the implementation may
      // re-fire native unregister defensively, which is intentional.
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formShown',
        formId: 'abc123',
        formName: 'Test Form',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clean up previous subscription when re-registering', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      Klaviyo.registerFormLifecycleHandler(handler1);
      mockRemove.mockClear();
      (
        NativeModules.KlaviyoReactNativeSdk
          .unregisterFormLifecycleHandler as jest.Mock
      ).mockClear();

      // Re-registering should remove the previous listener and native handler before adding new one
      Klaviyo.registerFormLifecycleHandler(handler2);
      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(
        NativeModules.KlaviyoReactNativeSdk.unregisterFormLifecycleHandler
      ).toHaveBeenCalledTimes(1);
    });

    it('logs error and noops when KlaviyoForms module is not available', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const defaultConstants =
        NativeModules.KlaviyoReactNativeSdk.getConstants();
      NativeModules.KlaviyoReactNativeSdk.getConstants.mockReturnValue({
        ...defaultConstants,
        FORMS_AVAILABLE: false,
      });

      try {
        const handler = jest.fn();
        const unsubscribe = Klaviyo.registerFormLifecycleHandler(handler);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('KlaviyoForms')
        );
        expect(
          NativeModules.KlaviyoReactNativeSdk.registerFormLifecycleHandler
        ).not.toHaveBeenCalled();

        // The returned no-op must be safe to call and must not touch the
        // native bridge — there's no listener or native registration to tear
        // down on the no-op path.
        expect(() => unsubscribe()).not.toThrow();
        expect(
          NativeModules.KlaviyoReactNativeSdk.unregisterFormLifecycleHandler
        ).not.toHaveBeenCalled();
      } finally {
        NativeModules.KlaviyoReactNativeSdk.getConstants.mockReturnValue(
          defaultConstants
        );
        consoleErrorSpy.mockRestore();
      }
    });

    it('should not forward events with missing formId', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formShown',
        formName: 'Test Form',
      });

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field(s): formId')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should not forward events with missing formName', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formDismissed',
        formId: 'abc123',
      });

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field(s): formName')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should not forward events with empty string formId', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formShown',
        formId: '',
        formName: 'Test Form',
      });

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field(s): formId')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should forward formCtaClicked events with missing buttonLabel as empty string', () => {
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Test Form',
        deepLinkUrl: 'myapp://products',
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Test Form',
        buttonLabel: '',
        deepLinkUrl: 'myapp://products',
      });
    });

    it('should not forward events with invalid type', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'unknownEventType',
        formId: 'abc123',
        formName: 'Test Form',
      });

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid type')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should not forward events with missing type', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        formId: 'abc123',
        formName: 'Test Form',
      });

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid type')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should report multiple missing fields at once', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formShown',
      });

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('formId')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('formName')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should not forward formCtaClicked events with missing deepLinkUrl', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const handler = jest.fn();
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formCtaClicked',
        formId: 'abc123',
        formName: 'Test Form',
        buttonLabel: 'Shop Now',
      });

      expect(handler).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field(s): deepLinkUrl')
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('auth token provider', () => {
    // The event listener is async (awaits the host provider), so tests must
    // flush the microtask queue after emitting before asserting on the
    // resulting `respondToAuthTokenRequest` call.
    const flushPromises = () => new Promise(process.nextTick);

    it('registers the native provider and subscribes to the request event', () => {
      Klaviyo.registerAuthTokenProvider(() => Promise.resolve('jwt-123'));

      expect(
        NativeModules.KlaviyoReactNativeSdk.registerAuthTokenProvider
      ).toHaveBeenCalledTimes(1);
    });

    it('invokes the provider and responds with the jwt on success', async () => {
      const provider = jest.fn().mockResolvedValue('jwt-abc');
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-1' });
      await flushPromises();

      expect(provider).toHaveBeenCalledTimes(1);
      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).toHaveBeenCalledWith('req-1', { jwt: 'jwt-abc' });
    });

    it('routes an empty-string resolution through the failure path', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const provider = jest.fn().mockResolvedValue('');
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-empty' });
      await flushPromises();

      const call = (
        NativeModules.KlaviyoReactNativeSdk
          .respondToAuthTokenRequest as jest.Mock
      ).mock.calls[0];
      expect(call[0]).toBe('req-empty');
      expect(call[1]).not.toHaveProperty('jwt');
      // The empty resolution is routed through the failure path; the forwarded
      // error is the redacted type (the thrown Error), not raw text.
      expect(call[1].error).toBe('Error');
      expect(call[1].isConnectivityError).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('responds with a redacted error type when the provider rejects', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // Host error text (which could contain the JWT) must not be forwarded —
      // only the error type is sent to native.
      const provider = jest
        .fn()
        .mockRejectedValue(new Error('auth server down token=secret'));
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-2' });
      await flushPromises();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).toHaveBeenCalledWith('req-2', {
        error: 'Error',
        isConnectivityError: false,
      });
      consoleErrorSpy.mockRestore();
    });

    it('flags connectivity errors so native can arm retry', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const provider = jest
        .fn()
        .mockRejectedValue(new TypeError('Network request failed'));
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-net' });
      await flushPromises();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).toHaveBeenCalledWith('req-net', {
        error: 'TypeError',
        isConnectivityError: true,
      });
      consoleErrorSpy.mockRestore();
    });

    it('honors an explicit isConnectivityError marker on the rejection', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const provider = jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('offline'), { isConnectivityError: true })
        );
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-marker' });
      await flushPromises();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).toHaveBeenCalledWith('req-marker', {
        error: 'Error',
        isConnectivityError: true,
      });
      consoleErrorSpy.mockRestore();
    });

    it('does not log the token contents on success', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      Klaviyo.registerAuthTokenProvider(() => Promise.resolve('secret-jwt'));

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-3' });
      await flushPromises();

      for (const spy of [consoleWarnSpy, consoleErrorSpy, consoleLogSpy]) {
        for (const call of spy.mock.calls) {
          expect(call.join(' ')).not.toContain('secret-jwt');
        }
      }
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('ignores requests with a missing or empty id', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const provider = jest.fn().mockResolvedValue('jwt');
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', {});
      emitNativeEvent('klaviyo:authTokenRequested', { id: '' });
      await flushPromises();

      expect(provider).not.toHaveBeenCalled();
      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid id')
      );
      consoleWarnSpy.mockRestore();
    });

    it('unregisters the native provider and removes the listener', () => {
      const provider = jest.fn().mockResolvedValue('jwt');
      Klaviyo.registerAuthTokenProvider(provider);
      // Clear counts from registration (which may tear down a leftover
      // subscription from a prior test) so we assert only the explicit
      // unregister call below.
      mockRemove.mockClear();
      (
        NativeModules.KlaviyoReactNativeSdk
          .unregisterAuthTokenProvider as jest.Mock
      ).mockClear();

      Klaviyo.unregisterAuthTokenProvider();

      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(
        NativeModules.KlaviyoReactNativeSdk.unregisterAuthTokenProvider
      ).toHaveBeenCalledTimes(1);
    });

    it('stops forwarding requests after unregistering', async () => {
      const provider = jest.fn().mockResolvedValue('jwt');
      Klaviyo.registerAuthTokenProvider(provider);
      Klaviyo.unregisterAuthTokenProvider();

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-4' });
      await flushPromises();

      expect(provider).not.toHaveBeenCalled();
    });

    it('drops a token fetched after the provider is unregistered mid-flight', async () => {
      // A slow provider that resolves after the user has logged out
      // (unregister) must not hand the now-stale token to native.
      let resolveProvider!: (value: string) => void;
      const provider = jest.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveProvider = resolve;
          })
      );
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-inflight' });
      // provider() is now in flight; log out before it resolves.
      Klaviyo.unregisterAuthTokenProvider();
      resolveProvider('jwt-after-logout');
      await flushPromises();

      expect(provider).toHaveBeenCalledTimes(1);
      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).not.toHaveBeenCalled();
    });

    it('replaces the previous listener when re-registering', () => {
      const provider1 = jest.fn().mockResolvedValue('jwt-1');
      const provider2 = jest.fn().mockResolvedValue('jwt-2');

      Klaviyo.registerAuthTokenProvider(provider1);
      mockRemove.mockClear();
      (
        NativeModules.KlaviyoReactNativeSdk
          .unregisterAuthTokenProvider as jest.Mock
      ).mockClear();

      Klaviyo.registerAuthTokenProvider(provider2);

      // The previous subscription is torn down before the new one is added,
      // and the native side is unregistered so pending requests are drained.
      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(
        NativeModules.KlaviyoReactNativeSdk.unregisterAuthTokenProvider
      ).toHaveBeenCalledTimes(1);
    });

    it('routes a request to only the most recently registered provider', async () => {
      const provider1 = jest.fn().mockResolvedValue('jwt-1');
      const provider2 = jest.fn().mockResolvedValue('jwt-2');

      Klaviyo.registerAuthTokenProvider(provider1);
      Klaviyo.registerAuthTokenProvider(provider2);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-5' });
      await flushPromises();

      expect(provider1).not.toHaveBeenCalled();
      expect(provider2).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscriptions', () => {
    it('should bridge per-channel consent as wire-format arrays', () => {
      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: {
          email: [EmailConsent.Marketing, EmailConsent.OpenTracking],
          sms: [MessagingConsent.Marketing],
          whatsapp: [MessagingConsent.Transactional],
        },
      });

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).toHaveBeenCalledWith({
        listId: 'ABC123',
        channels: {
          email: ['marketing', 'open_tracking'],
          sms: ['marketing'],
          whatsapp: ['transactional'],
        },
      });
    });

    it('should include customSource when provided', () => {
      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: { email: [EmailConsent.Marketing] },
        customSource: 'Checkout screen',
      });

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).toHaveBeenCalledWith({
        listId: 'ABC123',
        channels: { email: ['marketing'] },
        customSource: 'Checkout screen',
      });
    });

    it('should omit customSource when absent', () => {
      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: { email: [EmailConsent.Marketing] },
      });

      const payload = (
        NativeModules.KlaviyoReactNativeSdk.createSubscription as jest.Mock
      ).mock.calls[0][0];
      expect(payload).not.toHaveProperty('customSource');
    });

    it('should omit the channels key entirely for the all-available-marketing sentinel', () => {
      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: ALL_AVAILABLE_MARKETING,
      });

      const payload = (
        NativeModules.KlaviyoReactNativeSdk.createSubscription as jest.Mock
      ).mock.calls[0][0];
      expect(payload).not.toHaveProperty('channels');
      expect(payload).toEqual({ listId: 'ABC123' });
    });

    it('should omit the channels key for the allAvailableMarketing factory', () => {
      Klaviyo.createSubscription(
        allAvailableMarketing('ABC123', 'Signup form')
      );

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).toHaveBeenCalledWith({
        listId: 'ABC123',
        customSource: 'Signup form',
      });
    });

    it('should leave an omitted channel absent rather than sending an empty array', () => {
      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: { email: [EmailConsent.Marketing] },
      });

      const { channels } = (
        NativeModules.KlaviyoReactNativeSdk.createSubscription as jest.Mock
      ).mock.calls[0][0];
      expect(channels).not.toHaveProperty('sms');
      expect(channels).not.toHaveProperty('whatsapp');
    });

    it('should pass an explicitly empty channel through for native validation', () => {
      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: { email: [] },
      });

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).toHaveBeenCalledWith({
        listId: 'ABC123',
        channels: { email: [] },
      });
    });

    it('should not bridge a blank listId', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      Klaviyo.createSubscription({
        listId: '   ',
        channels: { email: [EmailConsent.Marketing] },
      });

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('listId')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should report rather than throw when an untyped caller omits channels', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // `channels` is required by the type, but plain-JS consumers can still omit it. Throwing a
      // TypeError out of a fire-and-forget SDK method would be worse than reporting it.
      expect(() =>
        Klaviyo.createSubscription({ listId: 'ABC123' } as never)
      ).not.toThrow();

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('channels')
      );
      consoleErrorSpy.mockRestore();
    });

    // A `channels` value that is present but malformed must never fall through to the broad grant —
    // that would hand out marketing consent on every identified channel by accident, which is the
    // exact failure mode the required-`channels` design exists to prevent.
    it.each([
      ['a string', 'allAvailable'],
      ['a number', 7],
      ['an array', ['email']],
      ['null', null],
      ['a boolean', true],
    ])(
      'should reject channels that is %s rather than granting broad consent',
      (_label, channels) => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        expect(() =>
          Klaviyo.createSubscription({ listId: 'ABC123', channels } as never)
        ).not.toThrow();

        expect(
          NativeModules.KlaviyoReactNativeSdk.createSubscription
        ).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('channels')
        );
        consoleErrorSpy.mockRestore();
      }
    );

    // A validly-typed channels object can still request nothing, either because every key was
    // omitted or because a key was misspelled. Either way the request would otherwise reach
    // native as a subscription that grants no consent, with the caller never told why.
    it('should reject an empty channels object rather than granting no consent silently', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() =>
        Klaviyo.createSubscription({ listId: 'ABC123', channels: {} })
      ).not.toThrow();

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('at least one channel')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should reject an unrecognized channel key rather than silently dropping it', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() =>
        Klaviyo.createSubscription({
          listId: 'ABC123',
          channels: { smss: [MessagingConsent.Marketing] } as never,
        })
      ).not.toThrow();

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('smss')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should reject a non-string listId rather than throwing on .trim()', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() =>
        Klaviyo.createSubscription({
          listId: 12345,
          channels: { email: [EmailConsent.Marketing] },
        } as never)
      ).not.toThrow();

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('listId')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should reject a consent list passed as a bare string', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Without validation this spread into ['m','a','r','k',...] and reached native as garbage.
      expect(() =>
        Klaviyo.createSubscription({
          listId: 'ABC123',
          channels: { email: 'marketing' },
        } as never)
      ).not.toThrow();

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('email')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should reject unsupported consent values', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: { sms: ['open_tracking'] },
      } as never);

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('open_tracking')
      );
      consoleErrorSpy.mockRestore();
    });

    it('should reject a non-string customSource', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      Klaviyo.createSubscription({
        listId: 'ABC123',
        channels: { email: [EmailConsent.Marketing] },
        customSource: 42,
      } as never);

      expect(
        NativeModules.KlaviyoReactNativeSdk.createSubscription
      ).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('customSource')
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('mobile inbox', () => {
    const native = () => NativeModules.KlaviyoReactNativeSdk;
    const inboxEvent = 'klaviyo:inboxChanged';

    /**
     * Unsubscribes registered by the running test, torn down in `afterEach`. The key registry is
     * module-level state, so without this a test that asserts on handler counts could see a
     * leftover subscriber from an earlier one.
     */
    let inboxUnsubscribes: Array<() => void> = [];

    /** Subscribes and records the unsubscribe handle for `afterEach` teardown. */
    function subscribe(handler: () => void): () => void {
      const unsubscribe = Klaviyo.subscribe(handler);
      inboxUnsubscribes.push(unsubscribe);
      return unsubscribe;
    }

    /** A bridged message as the native bridges emit one. */
    function bridgedMessage(
      overrides: Record<string, unknown> = {}
    ): Record<string, unknown> {
      return {
        id: 'msg-1',
        title: 'Hello',
        body: 'World',
        defaultDestination: { type: 'open_app' },
        customData: { key: 'value' },
        actions: [],
        sentAt: 1_700_000_000_000,
        receivedAt: 1_700_000_001_000,
        badge: null,
        isRead: false,
        isArchived: false,
        source: 'captured',
        ...overrides,
      };
    }

    afterEach(() => {
      // The handler registry is module-level state shared across tests. Tear down anything a test
      // left subscribed so ordering can't make a later test see a stale listener.
      while (inboxUnsubscribes.length > 0) {
        inboxUnsubscribes.pop()?.();
      }
      while (eventListeners[inboxEvent]?.length) {
        eventListeners[inboxEvent]!.pop();
      }
    });

    describe('fetchPage', () => {
      it('resolves a parsed page and forwards no options for the first page', async () => {
        native().fetchInboxPage.mockResolvedValue({
          messages: [bridgedMessage()],
          nextCursor: 'cursor-2',
        });

        const page = await Klaviyo.fetchPage();

        expect(native().fetchInboxPage).toHaveBeenCalledWith(null);
        expect(page.messages.map((message) => message.id)).toEqual(['msg-1']);
        expect(page.nextCursor).toBe('cursor-2');
      });

      it('forwards page size and cursor', async () => {
        native().fetchInboxPage.mockResolvedValue({ messages: [] });

        await Klaviyo.fetchPage({ pageSize: 50, cursor: 'cursor-2' });

        expect(native().fetchInboxPage).toHaveBeenCalledWith({
          pageSize: 50,
          cursor: 'cursor-2',
        });
      });

      it('truncates a fractional page size, since the bridge marshals an int', async () => {
        native().fetchInboxPage.mockResolvedValue({ messages: [] });

        await Klaviyo.fetchPage({ pageSize: 20.9, cursor: 'c' });

        expect(native().fetchInboxPage).toHaveBeenCalledWith({
          pageSize: 20,
          cursor: 'c',
        });
      });

      it('passes an out-of-range page size through for native to clamp', async () => {
        native().fetchInboxPage.mockResolvedValue({ messages: [] });

        await Klaviyo.fetchPage({ pageSize: 5_000 });

        expect(native().fetchInboxPage).toHaveBeenCalledWith({
          pageSize: 5_000,
        });
      });

      it('passes the cursor through byte for byte', async () => {
        native().fetchInboxPage.mockResolvedValue({ messages: [] });
        const cursor = 'opaque::token::%%';

        await Klaviyo.fetchPage({ cursor });

        expect(native().fetchInboxPage).toHaveBeenCalledWith({ cursor });
      });

      it('drops malformed messages but keeps the page and its cursor', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        native().fetchInboxPage.mockResolvedValue({
          messages: [bridgedMessage({ id: 'good' }), { isRead: 'no' }],
          nextCursor: 'next',
        });

        const page = await Klaviyo.fetchPage();

        expect(page.messages.map((message) => message.id)).toEqual(['good']);
        expect(page.nextCursor).toBe('next');
        consoleWarnSpy.mockRestore();
      });

      it('rejects with a TypeError when options is not an object', async () => {
        await expect(Klaviyo.fetchPage('nope' as never)).rejects.toBeInstanceOf(
          TypeError
        );
        expect(native().fetchInboxPage).not.toHaveBeenCalled();
      });

      it('rejects with a TypeError for a non-numeric page size', async () => {
        await expect(
          Klaviyo.fetchPage({ pageSize: '20' } as never)
        ).rejects.toBeInstanceOf(TypeError);
        expect(native().fetchInboxPage).not.toHaveBeenCalled();
      });

      it.each([
        ['an empty cursor', ''],
        ['a blank cursor', '   '],
      ])(
        'rejects %s as INBOX_INVALID_CURSOR without calling native',
        async (_label, cursor) => {
          const promise = Klaviyo.fetchPage({ cursor });

          await expect(promise).rejects.toBeInstanceOf(InboxError);
          await expect(promise).rejects.toMatchObject({
            code: InboxErrorCode.InvalidCursor,
          });
          expect(native().fetchInboxPage).not.toHaveBeenCalled();
        }
      );

      it('normalizes a native rejection into an InboxError with its code', async () => {
        native().fetchInboxPage.mockRejectedValue(
          Object.assign(new Error('bad cursor'), {
            code: InboxErrorCode.InvalidCursor,
          })
        );

        await expect(Klaviyo.fetchPage()).rejects.toMatchObject({
          name: 'InboxError',
          code: InboxErrorCode.InvalidCursor,
        });
      });

      it('forwards the filters', async () => {
        native().fetchInboxPage.mockResolvedValue({ messages: [] });

        await Klaviyo.fetchPage({
          readFilter: 'unread',
          archiveFilter: 'archived',
        });

        expect(native().fetchInboxPage).toHaveBeenCalledWith({
          readFilter: 'unread',
          archiveFilter: 'archived',
        });
      });

      it('omits absent filters so each platform default applies', async () => {
        native().fetchInboxPage.mockResolvedValue({ messages: [] });

        await Klaviyo.fetchPage({ pageSize: 10 });

        const payload = (native().fetchInboxPage as jest.Mock).mock.calls[0][0];
        expect(payload).toEqual({ pageSize: 10 });
        expect(payload).not.toHaveProperty('readFilter');
        expect(payload).not.toHaveProperty('archiveFilter');
      });

      it.each([
        ['an unknown read filter', { readFilter: 'deleted' }],
        ['an unknown archive filter', { archiveFilter: 'archivedOnly' }],
        ['a non-string read filter', { readFilter: 1 }],
      ])(
        'rejects %s with a TypeError without calling native',
        async (_label, options) => {
          await expect(
            Klaviyo.fetchPage(options as never)
          ).rejects.toBeInstanceOf(TypeError);
          expect(native().fetchInboxPage).not.toHaveBeenCalled();
        }
      );

      it('rejects a cursor reused under different filters as INBOX_INVALID_CURSOR', async () => {
        // Native validates the cursor against the filters that issued it. The wrapper must surface
        // that as the stable code rather than a generic failure, since it is a caller mistake with
        // a specific remedy (re-issue the cursor from a first page with these filters).
        native().fetchInboxPage.mockRejectedValue(
          Object.assign(new Error('cursor filter mismatch'), {
            code: InboxErrorCode.InvalidCursor,
          })
        );

        const promise = Klaviyo.fetchPage({
          cursor: 'cursor-from-a-different-filter',
          readFilter: 'unread',
          archiveFilter: 'active',
        });

        await expect(promise).rejects.toBeInstanceOf(InboxError);
        await expect(promise).rejects.toMatchObject({
          code: InboxErrorCode.InvalidCursor,
        });
        // The cursor and filters are forwarded together, so native can do the comparison.
        expect(native().fetchInboxPage).toHaveBeenCalledWith({
          cursor: 'cursor-from-a-different-filter',
          readFilter: 'unread',
          archiveFilter: 'active',
        });
      });

      it('normalizes a codeless native rejection into a storage failure', async () => {
        native().fetchInboxPage.mockRejectedValue(new Error('bridge exploded'));

        await expect(Klaviyo.fetchPage()).rejects.toMatchObject({
          code: InboxErrorCode.StorageFailure,
        });
      });
    });

    describe('fetchUnreadCount', () => {
      it('resolves the native count', async () => {
        native().fetchInboxUnreadCount.mockResolvedValue(4);

        await expect(Klaviyo.fetchUnreadCount()).resolves.toBe(4);
      });

      it('normalizes a native rejection into an InboxError', async () => {
        native().fetchInboxUnreadCount.mockRejectedValue(
          Object.assign(new Error('store'), {
            code: InboxErrorCode.StorageFailure,
          })
        );

        await expect(Klaviyo.fetchUnreadCount()).rejects.toMatchObject({
          code: InboxErrorCode.StorageFailure,
        });
      });
    });

    describe('updateMessageState', () => {
      it.each(['read', 'unread', 'archived', 'unarchived'] as const)(
        'forwards the %s state',
        async (state) => {
          native().updateInboxMessageState.mockResolvedValue(true);

          await expect(
            Klaviyo.updateMessageState('msg-1', state)
          ).resolves.toBe(true);
          expect(native().updateInboxMessageState).toHaveBeenCalledWith(
            'msg-1',
            state
          );
        }
      );

      it('resolves false when the message does not exist', async () => {
        native().updateInboxMessageState.mockResolvedValue(false);

        await expect(Klaviyo.updateMessageState('gone', 'read')).resolves.toBe(
          false
        );
      });

      it.each([
        ['an empty message ID', '', 'read'],
        ['a blank message ID', '   ', 'read'],
        ['an unknown state', 'msg-1', 'deleted'],
        ['a differently-cased state', 'msg-1', 'READ'],
      ])(
        'rejects %s with a TypeError without calling native',
        async (_label, messageId, state) => {
          await expect(
            Klaviyo.updateMessageState(messageId, state as never)
          ).rejects.toBeInstanceOf(TypeError);
          expect(native().updateInboxMessageState).not.toHaveBeenCalled();
        }
      );

      it('normalizes a native rejection into an InboxError', async () => {
        native().updateInboxMessageState.mockRejectedValue(
          Object.assign(new Error('store'), {
            code: InboxErrorCode.StorageFailure,
          })
        );

        await expect(
          Klaviyo.updateMessageState('msg-1', 'read')
        ).rejects.toMatchObject({ code: InboxErrorCode.StorageFailure });
      });
    });

    describe('updateMessageStates', () => {
      it.each(['read', 'unread', 'archived', 'unarchived'] as const)(
        'forwards the %s state with its filter',
        async (state) => {
          native().updateInboxMessageStates.mockResolvedValue(3);

          await expect(
            Klaviyo.updateMessageStates(
              state,
              InboxFilter.where(
                InboxReadFilter.Unread,
                InboxArchiveFilter.Active
              )
            )
          ).resolves.toBe(3);
          expect(native().updateInboxMessageStates).toHaveBeenCalledWith(
            state,
            'unread',
            'active'
          );
        }
      );

      it('sends allMessages as all and all', async () => {
        native().updateInboxMessageStates.mockResolvedValue(0);

        await Klaviyo.updateMessageStates('archived', InboxFilter.allMessages);

        expect(native().updateInboxMessageStates).toHaveBeenCalledWith(
          'archived',
          'all',
          'all'
        );
      });

      it('resolves zero when nothing changed', async () => {
        native().updateInboxMessageStates.mockResolvedValue(0);

        await expect(
          Klaviyo.updateMessageStates('read', InboxFilter.allMessages)
        ).resolves.toBe(0);
      });

      it('normalizes a native rejection into an InboxError', async () => {
        native().updateInboxMessageStates.mockRejectedValue(
          Object.assign(new Error('store'), {
            code: InboxErrorCode.StorageFailure,
          })
        );

        await expect(
          Klaviyo.updateMessageStates('read', InboxFilter.allMessages)
        ).rejects.toMatchObject({ code: InboxErrorCode.StorageFailure });
      });
    });

    describe('subscribe', () => {
      it('invokes the handler with no payload when native emits a change', () => {
        const handler = jest.fn();
        subscribe(handler);

        emitNativeEvent(inboxEvent);

        expect(handler).toHaveBeenCalledTimes(1);
        // The event is an invalidation, not a delta: nothing is passed to the handler.
        expect(handler).toHaveBeenCalledWith();
      });

      it('starts and stops the native change signal around the first and last subscriber', () => {
        const unsubscribe = subscribe(jest.fn());
        expect(native().registerInboxChangeHandler).toHaveBeenCalledTimes(1);

        unsubscribe();
        expect(native().unregisterInboxChangeHandler).toHaveBeenCalledTimes(1);
      });

      it('adds only one native listener for multiple subscribers', () => {
        subscribe(jest.fn());
        subscribe(jest.fn());

        // Both subscribers share the single underlying listener created by the first subscribe.
        expect(eventListeners[inboxEvent]).toHaveLength(1);
      });

      it('notifies every subscriber', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        subscribe(handler1);
        subscribe(handler2);

        emitNativeEvent(inboxEvent);

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
      });

      it('removes the native listener when the last subscriber unsubscribes', () => {
        const unsubscribe = subscribe(jest.fn());
        mockRemove.mockClear();

        unsubscribe();

        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(eventListeners[inboxEvent] ?? []).toHaveLength(0);
      });

      it('keeps the listener while another subscriber remains', () => {
        const unsubscribe1 = subscribe(jest.fn());
        const handler2 = jest.fn();
        subscribe(handler2);
        mockRemove.mockClear();

        unsubscribe1();

        expect(mockRemove).not.toHaveBeenCalled();
        emitNativeEvent(inboxEvent);
        expect(handler2).toHaveBeenCalledTimes(1);
      });

      it('stops notifying a handler after it unsubscribes', () => {
        const handler = jest.fn();
        const unsubscribe = subscribe(handler);
        unsubscribe();

        emitNativeEvent(inboxEvent);

        expect(handler).not.toHaveBeenCalled();
      });

      it('is safe to unsubscribe more than once', () => {
        const handler = jest.fn();
        const unsubscribe = subscribe(handler);

        unsubscribe();
        expect(() => unsubscribe()).not.toThrow();

        emitNativeEvent(inboxEvent);
        expect(handler).not.toHaveBeenCalled();
      });

      it('registers a handler added twice only once', () => {
        const handler = jest.fn();
        const unsubscribe = subscribe(handler);
        subscribe(handler);

        emitNativeEvent(inboxEvent);
        expect(handler).toHaveBeenCalledTimes(1);

        // Either handle removes the handler entirely.
        unsubscribe();
        emitNativeEvent(inboxEvent);
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('keeps notifying the other handlers when one throws', () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();
        const throwing = jest.fn(() => {
          throw new Error('handler blew up');
        });
        const healthy = jest.fn();
        subscribe(throwing);
        subscribe(healthy);

        expect(() => emitNativeEvent(inboxEvent)).not.toThrow();
        expect(healthy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error in inbox change handler'),
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('handles a handler unsubscribing from inside the notification', () => {
        const handler2 = jest.fn();
        let unsubscribe2 = () => {};
        const handler1 = jest.fn(() => unsubscribe2());
        subscribe(handler1);
        unsubscribe2 = subscribe(handler2);

        expect(() => emitNativeEvent(inboxEvent)).not.toThrow();
        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);

        // The second change must not reach the handler that detached during the first.
        emitNativeEvent(inboxEvent);
        expect(handler1).toHaveBeenCalledTimes(2);
        expect(handler2).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the native inbox module is not in the build', () => {
      let consoleErrorSpy: jest.SpyInstance;
      let defaultConstants: Record<string, unknown>;

      beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        defaultConstants = native().getConstants();
        native().getConstants.mockReturnValue({
          ...defaultConstants,
          INBOX_AVAILABLE: false,
        });
      });

      afterEach(() => {
        native().getConstants.mockReturnValue(defaultConstants);
        consoleErrorSpy.mockRestore();
      });

      it.each([
        ['fetchPage', () => Klaviyo.fetchPage()],
        ['fetchUnreadCount', () => Klaviyo.fetchUnreadCount()],
        ['updateMessageState', () => Klaviyo.updateMessageState('id', 'read')],
        [
          'updateMessageStates',
          () => Klaviyo.updateMessageStates('read', InboxFilter.allMessages),
        ],
      ])('rejects %s with INBOX_UNAVAILABLE', async (_label, call) => {
        const promise = call();

        await expect(promise).rejects.toBeInstanceOf(InboxError);
        await expect(promise).rejects.toMatchObject({
          code: InboxErrorCode.Unavailable,
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Mobile Inbox is not available')
        );
      });

      it('does not call native', async () => {
        await expect(Klaviyo.fetchPage()).rejects.toThrow();
        await expect(Klaviyo.fetchUnreadCount()).rejects.toThrow();
        await expect(
          Klaviyo.updateMessageState('id', 'read')
        ).rejects.toThrow();
        await expect(
          Klaviyo.updateMessageStates('read', InboxFilter.allMessages)
        ).rejects.toThrow();

        expect(native().fetchInboxPage).not.toHaveBeenCalled();
        expect(native().fetchInboxUnreadCount).not.toHaveBeenCalled();
        expect(native().updateInboxMessageState).not.toHaveBeenCalled();
        expect(native().updateInboxMessageStates).not.toHaveBeenCalled();
      });

      it('returns a no-op unsubscribe that touches no native method', () => {
        const handler = jest.fn();
        const unsubscribe = Klaviyo.subscribe(handler);

        expect(() => unsubscribe()).not.toThrow();
        expect(native().registerInboxChangeHandler).not.toHaveBeenCalled();
        expect(native().unregisterInboxChangeHandler).not.toHaveBeenCalled();

        emitNativeEvent(inboxEvent);
        expect(handler).not.toHaveBeenCalled();
      });
    });

    it('treats a missing INBOX_AVAILABLE constant as unavailable', async () => {
      // A native module older than this SDK exports no such constant. Treating it as available
      // would turn a clean INBOX_UNAVAILABLE rejection into a TypeError from calling a method the
      // module does not have.
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const defaultConstants = native().getConstants();
      native().getConstants.mockReturnValue({
        PROFILE_KEYS: defaultConstants.PROFILE_KEYS,
        EVENT_NAMES: defaultConstants.EVENT_NAMES,
      });

      try {
        await expect(Klaviyo.fetchPage()).rejects.toMatchObject({
          code: InboxErrorCode.Unavailable,
        });
      } finally {
        native().getConstants.mockReturnValue(defaultConstants);
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
