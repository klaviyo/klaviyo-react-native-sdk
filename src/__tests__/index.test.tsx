import { NativeModules } from 'react-native';
import { Klaviyo } from '../index';
import { EventName } from '../Event';
import { ProfileProperty } from '../Profile';

// Store event listeners for testing NativeEventEmitter
const eventListeners: Record<string, Array<(data: any) => void>> = {};
const mockRemove = jest.fn();

// Mock the native module
jest.mock('react-native', () => {
  return {
    NativeModules: {
      KlaviyoReactNativeSdk: {
        initialize: jest.fn(),
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
        registerForInAppForms: jest.fn(),
        unregisterFromInAppForms: jest.fn(),
        registerFormLifecycleHandler: jest.fn(),
        unregisterFormLifecycleHandler: jest.fn(),
        registerAuthTokenProvider: jest.fn(),
        unregisterAuthTokenProvider: jest.fn(),
        respondToAuthTokenRequest: jest.fn(),
        registerGeofencing: jest.fn(),
        unregisterGeofencing: jest.fn(),
        getCurrentGeofences: jest.fn(),
        handleUniversalTrackingLink: jest.fn(),
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

// Helper to simulate native event emission
function emitNativeEvent(eventName: string, data: any) {
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

    it('responds with an error message when the provider rejects', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const provider = jest
        .fn()
        .mockRejectedValue(new Error('auth server down'));
      Klaviyo.registerAuthTokenProvider(provider);

      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-2' });
      await flushPromises();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).toHaveBeenCalledWith('req-2', {
        error: 'auth server down',
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
        error: 'Network request failed',
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
        error: 'offline',
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
      mockRemove.mockClear();

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

    it('replaces the previous listener when re-registering', () => {
      const provider1 = jest.fn().mockResolvedValue('jwt-1');
      const provider2 = jest.fn().mockResolvedValue('jwt-2');

      Klaviyo.registerAuthTokenProvider(provider1);
      mockRemove.mockClear();

      Klaviyo.registerAuthTokenProvider(provider2);

      // The previous subscription is torn down before the new one is added.
      expect(mockRemove).toHaveBeenCalledTimes(1);
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
});
