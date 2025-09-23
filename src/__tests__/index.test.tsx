import { NativeModules } from 'react-native';
import { Klaviyo } from '../index';
import { EventName } from '../Event';
import { ProfileProperty } from '../Profile';

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
        }),
      },
    },
    Platform: {
      select: jest.fn().mockImplementation((obj) => obj.ios),
    },
  };
});

describe('Klaviyo SDK', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
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
});
