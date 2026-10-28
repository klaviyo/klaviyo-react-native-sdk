import { NativeModules } from 'react-native';
import { readFileSync } from 'fs';
import { runInNewContext } from 'vm';
import { ModuleKind, transpileModule } from 'typescript';
import { Klaviyo } from '../index';
import type { FormConfiguration } from '../Forms';
import { EventName } from '../Event';
import { ProfileProperty } from '../Profile';
import {
  ALL_AVAILABLE_MARKETING,
  EmailConsent,
  MessagingConsent,
  allAvailableMarketing,
} from '../Subscription';

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
        openForm: jest.fn(),
        registerFormLifecycleHandler: jest.fn(),
        respondToFormWillDisplay: jest.fn(),
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

function loadRefreshableSdkModule() {
  const source = readFileSync(require.resolve('../index'), 'utf8');
  const { outputText } = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS },
  });
  let dispose: (() => void) | undefined;
  const sdkModule = {
    exports: {} as typeof import('../index'),
    hot: {
      dispose: (callback: () => void) => {
        dispose = callback;
      },
    },
  };
  runInNewContext(outputText, {
    module: sdkModule,
    exports: sdkModule.exports,
    require: (name: string) => require(name.replace(/^\.\//, '../')),
    console,
  });
  return { Klaviyo: sdkModule.exports.Klaviyo, dispose: () => dispose?.() };
}

describe('Klaviyo SDK', () => {
  beforeEach(() => {
    Klaviyo.unregisterFromInAppForms();
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
    it.each(['form-id', '  form-id  ', 'quote\'"\\\n-id', '   '])(
      'submits the exact form ID %p as a void command',
      (formId) => {
        const native = NativeModules.KlaviyoReactNativeSdk;
        native.openForm.mockReturnValueOnce(true);

        expect(Klaviyo.openForm(formId)).toBeUndefined();

        expect(native.openForm).toHaveBeenCalledTimes(1);
        expect(native.openForm).toHaveBeenCalledWith(formId);
        expect(native.registerForInAppForms).not.toHaveBeenCalled();
        expect(native.unregisterFromInAppForms).not.toHaveBeenCalled();
        expect(eventListeners.KlaviyoFormsFailure ?? []).toHaveLength(0);
      }
    );

    it('should register for in-app forms with configuration', () => {
      const config = {
        sessionTimeoutDuration: 3600,
      };

      Klaviyo.registerForInAppForms(config);
      expect(
        NativeModules.KlaviyoReactNativeSdk.registerForInAppForms
      ).toHaveBeenCalledWith(config, expect.any(String));
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

        consoleErrorSpy.mockClear();

        expect(Klaviyo.openForm('form-id')).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('KlaviyoForms')
        );
        expect(
          NativeModules.KlaviyoReactNativeSdk.openForm
        ).not.toHaveBeenCalled();
      } finally {
        NativeModules.KlaviyoReactNativeSdk.getConstants.mockReturnValue(
          defaultConstants
        );
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('forms failure transport', () => {
    const native = NativeModules.KlaviyoReactNativeSdk;
    const register = (configuration?: Record<string, unknown>) =>
      Klaviyo.registerForInAppForms(configuration as never);
    const epoch = () => native.registerForInAppForms.mock.lastCall[1];
    const fail = (registrationEpoch = epoch()) =>
      emitNativeEvent('KlaviyoFormsFailure', { registrationEpoch });

    it('keeps gate responses active through failure callback replacement and forms cleanup', async () => {
      const firstCallback = jest.fn();
      const latestCallback = jest.fn();
      const handler = jest.fn().mockReturnValue(false);
      const unsubscribe = Klaviyo.registerFormLifecycleHandler(handler);
      register({ onFailure: firstCallback });
      register({ onFailure: latestCallback });
      fail();
      expect(firstCallback).not.toHaveBeenCalled();
      expect(latestCallback).toHaveBeenCalledTimes(1);

      Klaviyo.unregisterFromInAppForms();
      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'after-cleanup',
        formType: 'modal',
      });
      await new Promise(process.nextTick);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(native.respondToFormWillDisplay).toHaveBeenCalledWith(
        'after-cleanup',
        false
      );
      expect(native.unregisterFormLifecycleHandler).not.toHaveBeenCalled();
      unsubscribe();
    });

    it.each(['unregister', 'refresh'])(
      'keeps the auth provider active after forms %s cleanup',
      async (cleanup) => {
        const sdkModule = loadRefreshableSdkModule();
        const provider = jest.fn().mockResolvedValue('jwt-after-cleanup');
        const onFailure = jest.fn();
        sdkModule.Klaviyo.registerAuthTokenProvider(provider);
        sdkModule.Klaviyo.registerForInAppForms({ onFailure });
        const registrationEpoch = epoch();

        if (cleanup === 'refresh') {
          sdkModule.dispose();
        } else {
          sdkModule.Klaviyo.unregisterFromInAppForms();
        }
        fail(registrationEpoch);
        emitNativeEvent('klaviyo:authTokenRequested', { id: 'after-cleanup' });
        await new Promise(process.nextTick);

        expect(onFailure).not.toHaveBeenCalled();
        expect(eventListeners.KlaviyoFormsFailure).toHaveLength(0);
        expect(eventListeners['klaviyo:authTokenRequested']).toHaveLength(1);
        expect(native.unregisterAuthTokenProvider).not.toHaveBeenCalled();
        expect(native.respondToAuthTokenRequest).toHaveBeenCalledWith(
          'after-cleanup',
          { jwt: 'jwt-after-cleanup' }
        );
        sdkModule.Klaviyo.unregisterAuthTokenProvider();
      }
    );

    it('releases the previous module transport before Fast Refresh replacement registers', () => {
      const firstModule = loadRefreshableSdkModule();
      const firstCallback = jest.fn();
      firstModule.Klaviyo.registerForInAppForms({ onFailure: firstCallback });
      const firstEpoch = epoch();
      const queuedListener = eventListeners.KlaviyoFormsFailure?.[0];

      firstModule.dispose();
      queuedListener?.({ registrationEpoch: firstEpoch });
      expect(firstCallback).not.toHaveBeenCalled();
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(0);
      expect(native.unregisterFromInAppForms).toHaveBeenCalledTimes(1);

      const replacement = loadRefreshableSdkModule();
      const replacementCallback = jest.fn();
      replacement.Klaviyo.registerForInAppForms({
        onFailure: replacementCallback,
      });
      expect(epoch()).not.toBe(firstEpoch);
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(1);
      firstModule.dispose();
      expect(native.unregisterFromInAppForms).toHaveBeenCalledTimes(1);
      fail(firstEpoch);
      expect(firstCallback).not.toHaveBeenCalled();
      expect(replacementCallback).not.toHaveBeenCalled();
      fail();
      expect(replacementCallback).toHaveBeenCalledTimes(1);

      replacement.Klaviyo.unregisterFromInAppForms();
      replacement.dispose();
      expect(native.unregisterFromInAppForms).toHaveBeenCalledTimes(2);
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(0);
    });

    it('serializes optional seconds without sending the callback or extra fields', () => {
      const configuration: FormConfiguration = {
        loadTimeout: 5.5,
        eventReplayWindow: 2,
        onFailure: jest.fn(),
      };
      register({
        ...configuration,
        extra: 'ignored',
      });
      expect(native.registerForInAppForms).toHaveBeenLastCalledWith(
        { loadTimeout: 5.5, eventReplayWindow: 2 },
        expect.any(String)
      );
    });

    it('preserves omitted native defaults', () => {
      register();
      expect(native.registerForInAppForms).toHaveBeenLastCalledWith(
        {},
        expect.any(String)
      );
    });

    it.each([0, -1, NaN, Infinity, 0.00001, 1e30, '5'])(
      'omits invalid loadTimeout %s with a diagnostic',
      (loadTimeout) => {
        const warning = jest.spyOn(console, 'warn').mockImplementation();
        try {
          register({ loadTimeout });
          expect(native.registerForInAppForms).toHaveBeenLastCalledWith(
            {},
            expect.any(String)
          );
          expect(warning).toHaveBeenCalledWith(
            expect.stringContaining('loadTimeout')
          );
        } finally {
          warning.mockRestore();
        }
      }
    );

    it.each([
      [0, 0],
      [-2, 0],
      [90, 30],
      [Infinity, 30],
      [-Infinity, 0],
    ])('bounds replay %s to %s', (eventReplayWindow, expected) => {
      register({ eventReplayWindow });
      expect(native.registerForInAppForms).toHaveBeenLastCalledWith(
        { eventReplayWindow: expected },
        expect.any(String)
      );
    });

    it('omits nonfinite session and NaN replay values', () => {
      const warning = jest.spyOn(console, 'warn').mockImplementation();
      try {
        register({ sessionTimeoutDuration: Infinity, eventReplayWindow: NaN });
        expect(native.registerForInAppForms).toHaveBeenLastCalledWith(
          {},
          expect.any(String)
        );
      } finally {
        warning.mockRestore();
      }
    });

    it('receives failure during native registration before any public listener exists', () => {
      const callback = jest.fn();
      native.registerForInAppForms.mockImplementationOnce(
        (_config: unknown, registrationEpoch: string) => fail(registrationEpoch)
      );
      register({ onFailure: callback });
      expect(callback).toHaveBeenCalledWith();
    });

    it('uses the latest callback without replacing the listener or epoch', () => {
      const first = jest.fn();
      const second = jest.fn();
      register({ onFailure: first });
      const initialEpoch = epoch();
      register({ onFailure: second, loadTimeout: 4 });
      expect(epoch()).toBe(initialEpoch);
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(1);
      fail();
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('allows adding a callback after registering without one, and omission clears it', () => {
      const callback = jest.fn();
      register();
      register({ onFailure: callback });
      fail();
      register();
      fail();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(1);
    });

    it('keeps private failures independent of lifecycle listener removal', () => {
      const callback = jest.fn();
      register({ onFailure: callback });
      const unsubscribe = Klaviyo.registerFormLifecycleHandler(jest.fn());
      unsubscribe();
      fail();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('rejects queued callbacks and events from an unregistered epoch', () => {
      const callback = jest.fn();
      register({ onFailure: callback });
      const previousEpoch = epoch();
      const queuedListener = eventListeners.KlaviyoFormsFailure?.[0];
      Klaviyo.unregisterFromInAppForms();
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(0);
      register({ onFailure: callback });
      expect(epoch()).not.toBe(previousEpoch);
      queuedListener?.({ registrationEpoch: previousEpoch });
      fail(previousEpoch);
      expect(callback).not.toHaveBeenCalled();
      fail();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('keeps immediate host retries and subsequent actual failures subscribed', () => {
      const retryCallback = jest.fn();
      register({ onFailure: () => register({ onFailure: retryCallback }) });
      fail();
      fail();
      fail();
      expect(retryCallback).toHaveBeenCalledTimes(2);
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(1);
    });

    it('keeps a replacement registration made after unregister inside the callback', () => {
      const retryCallback = jest.fn();
      register({
        onFailure: () => {
          Klaviyo.unregisterFromInAppForms();
          register({ onFailure: retryCallback });
        },
      });
      fail();
      fail();
      expect(retryCallback).toHaveBeenCalledTimes(1);
      expect(eventListeners.KlaviyoFormsFailure).toHaveLength(1);
    });

    it('does not attach a private listener when Forms is unavailable', () => {
      const constants = native.getConstants();
      const diagnostic = jest.spyOn(console, 'error').mockImplementation();
      native.getConstants.mockReturnValueOnce({
        ...constants,
        FORMS_AVAILABLE: false,
      });
      try {
        register({ onFailure: jest.fn() });
        expect(native.registerForInAppForms).not.toHaveBeenCalled();
        expect(eventListeners.KlaviyoFormsFailure ?? []).toHaveLength(0);
      } finally {
        diagnostic.mockRestore();
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

    it('should call respondToFormWillDisplay with true when handler returns true', async () => {
      const handler = jest.fn().mockReturnValue(true);
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: 'Test Form',
        formType: 'POPUP',
      });

      expect(handler).toHaveBeenCalledWith({
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: 'Test Form',
        formType: 'POPUP',
      });

      // Wait for the Promise.resolve microtask
      await Promise.resolve();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('abc123', true);
    });

    it('should reject a native gating event with an empty form name', async () => {
      const handler = jest.fn().mockReturnValue(false);
      Klaviyo.registerFormLifecycleHandler(handler);
      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: '',
        formType: 'POPUP',
      });
      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith({
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: '',
        formType: 'POPUP',
      });
      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('abc123', false);
    });

    it('should call respondToFormWillDisplay with false when handler returns false', async () => {
      const handler = jest.fn().mockReturnValue(false);
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: 'Test Form',
        formType: 'POPUP',
      });

      await Promise.resolve();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('abc123', false);
    });

    it('should default to accepting when handler returns void/undefined', async () => {
      const handler = jest.fn(); // returns undefined
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: 'Test Form',
        formType: 'POPUP',
      });

      await Promise.resolve();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('abc123', true);
    });

    it('should handle async handler returning a Promise', async () => {
      const handler = jest.fn().mockResolvedValue(false);
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: 'Test Form',
        formType: 'POPUP',
      });

      // Need to flush the microtask queue for the resolved promise
      await Promise.resolve();
      await Promise.resolve();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('abc123', false);
    });

    it('should default to accepting when handler throws', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('handler error'));
      Klaviyo.registerFormLifecycleHandler(handler);

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: 'Test Form',
        formType: 'POPUP',
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('abc123', true);
    });

    it('should fail-open when handler throws synchronously', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('sync kaboom');
      });
      Klaviyo.registerFormLifecycleHandler(handler);

      // Clear mocks from re-registration cleanup
      jest.clearAllMocks();

      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'abc123',
        formName: 'Test Form',
        formType: 'POPUP',
      });

      // Synchronous — no await needed
      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('abc123', true);

      consoleErrorSpy.mockRestore();
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

    it('keeps auth requests subscribed after lifecycle cleanup', async () => {
      Klaviyo.registerAuthTokenProvider(() => Promise.resolve('jwt-active'));
      const unsubscribe = Klaviyo.registerFormLifecycleHandler(() => false);

      unsubscribe();
      emitNativeEvent('klaviyo:authTokenRequested', { id: 'req-after-forms' });
      await flushPromises();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToAuthTokenRequest
      ).toHaveBeenCalledWith('req-after-forms', { jwt: 'jwt-active' });
    });

    it('keeps form gating subscribed after auth provider cleanup', async () => {
      Klaviyo.registerAuthTokenProvider(() => Promise.resolve('jwt-active'));
      const unsubscribe = Klaviyo.registerFormLifecycleHandler(() => false);

      Klaviyo.unregisterAuthTokenProvider();
      emitNativeEvent('FormLifecycleEvent', {
        type: 'formWillDisplay',
        formId: 'form-after-auth',
        formType: 'POPUP',
      });
      await flushPromises();

      expect(
        NativeModules.KlaviyoReactNativeSdk.respondToFormWillDisplay
      ).toHaveBeenCalledWith('form-after-auth', false);
      unsubscribe();
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
});
