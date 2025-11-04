import {
  type Event,
  Klaviyo,
  type Location,
  type Profile,
  ProfileProperty,
  type FormConfiguration,
} from 'klaviyo-react-native-sdk';

import {
  generateRandomAddress,
  generateRandomEmails,
  generateRandomName,
  generateRandomPhoneNumber,
  getRandomMetric,
} from './RandomGenerators';

import { Alert, Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  openSettings,
  request,
} from 'react-native-permissions';

export const initialize = async () => {
  try {
    // Alternate Android Installation Step 3
    // Alternate iOS Installation Step 3
    // Initialize the SDK with public key, if initializing from React Native
    Klaviyo.initialize('YOUR_KLAVIYO_PUBLIC_API_KEY');
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setEmail = async () => {
  try {
    Klaviyo.setEmail(generateRandomEmails());
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setPhoneNumber = async () => {
  try {
    Klaviyo.setPhoneNumber(generateRandomPhoneNumber());
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setExternalId = async () => {
  try {
    Klaviyo.setExternalId(generateRandomName(5));
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setBadgeCount = async () => {
  try {
    const getRandomDigit = () => Math.floor(Math.random() * 10);
    Klaviyo.setBadgeCount(getRandomDigit());
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getEmail = async () => {
  try {
    Klaviyo.getEmail((value: string) => {
      console.log('email = ', value);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getPhoneNumber = async () => {
  try {
    Klaviyo.getPhoneNumber((phoneNumber: string) => {
      console.log('phone number = ', phoneNumber);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getExternalId = async () => {
  try {
    Klaviyo.getExternalId((externalId: string) => {
      console.log('external id = ', externalId);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const resetProfile = async () => {
  try {
    Klaviyo.resetProfile();
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const registerForInAppForms = async () => {
  try {
    let config: FormConfiguration = { sessionTimeoutDuration: 10 }; // 10 seconds
    Klaviyo.registerForInAppForms(config);
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const unregisterFromInAppForms = async () => {
  try {
    Klaviyo.unregisterFromInAppForms();
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const registerGeofencing = async () => {
  try {
    Klaviyo.registerGeofencing();
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const unregisterGeofencing = async () => {
  try {
    Klaviyo.unregisterGeofencing();
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setPushToken = async () => {
  try {
    // If handling push tokens from the react native layer
    // You would need a cross-platform push library to fetch the device token, e.g. firebase
    Klaviyo.setPushToken('FAKE_PUSH_TOKEN');
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getPushToken = async () => {
  try {
    Klaviyo.getPushToken((asyncPushToken: string) => {
      console.log(`getPushToken asynchronously returned ${asyncPushToken}`);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setProfileAttribute = async () => {
  try {
    Klaviyo.setProfileAttribute(ProfileProperty.CITY, generateRandomName(5));
    Klaviyo.setProfileAttribute(ProfileProperty.IMAGE, generateRandomName(5));
    Klaviyo.setProfileAttribute('MY_CUSTOM_PROPERTY', generateRandomName(5));
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setProfile = async () => {
  try {
    const myLocation: Location = {
      address1: generateRandomAddress().street,
      address2: 'apt 123',
      city: generateRandomAddress().city,
      country: 'USA',
      latitude: 99,
      longitude: 99,
      region: generateRandomAddress().city,
      zip: generateRandomAddress().zipCode,
      timezone: 'EST',
    };

    const myProperties: Record<ProfileProperty, any> = {
      [ProfileProperty.FIRST_NAME]: generateRandomName(5),
      [ProfileProperty.LAST_NAME]: generateRandomName(5),
      [ProfileProperty.ADDRESS1]: generateRandomAddress().street,
      [ProfileProperty.ADDRESS2]: 'Apt 456',
      [ProfileProperty.TITLE]: 'Mr.',
      [ProfileProperty.ORGANIZATION]: 'ABC Inc.',
      [ProfileProperty.CITY]: 'Cityville',
      [ProfileProperty.REGION]: 'Regionville',
      [ProfileProperty.COUNTRY]: 'Countryland',
      [ProfileProperty.ZIP]: '12345',
      [ProfileProperty.IMAGE]: 'profile.jpg',
      [ProfileProperty.LATITUDE]: 40.7128,
      [ProfileProperty.LONGITUDE]: -74.006,
    };

    const myProfile: Profile = {
      email: generateRandomEmails(),
      phoneNumber: generateRandomPhoneNumber(),
      externalId: generateRandomName(8),
      firstName: generateRandomName(7),
      lastName: generateRandomName(4),
      organization: generateRandomName(5),
      title: generateRandomName(6),
      image: generateRandomName(5),
      location: myLocation,
      properties: {
        ...myProperties,
        // Test boolean/number properties in profile
        isSubscribed: true,
        hasConsented: false,
        numberOfDogs: 0,
        numberOfCats: 1,
      },
    };

    Klaviyo.setProfile(myProfile);
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const sendRandomEvent = async () => {
  try {
    const event: Event = {
      name: getRandomMetric(),
      value: Math.floor(Math.random() * 100),
      properties: {
        testKey: generateRandomName(3),
        // Test boolean/number properties in event
        true: true,
        false: false,
        number0: 0,
        number1: 1,
        decimal: 1.23456789,
      },
      uniqueId: generateRandomName(5),
    };
    Klaviyo.createEvent(event);
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

const handleDeniedPermissionModal = () => {
  Alert.alert(
    'Permission Required',
    'We need access to your location to provide accurate results and personalized services. Please enable location permissions in your device settings.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => openSettings(),
      },
    ]
  );
};

export const requestLocationPermission = async () => {
  try {
    if (Platform.OS === 'ios') {
      const whenInUseStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (
        whenInUseStatus !== RESULTS.GRANTED &&
        whenInUseStatus !== RESULTS.LIMITED
      ) {
        const whenInUseResult = await request(
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        );
        switch (whenInUseResult) {
          case RESULTS.UNAVAILABLE:
            console.log('Location permission is not available on this device.');
            return;
          case RESULTS.BLOCKED:
          case RESULTS.DENIED:
            console.log('Location permission was blocked or denied.');
            handleDeniedPermissionModal();
            return;
          case RESULTS.GRANTED:
          case RESULTS.LIMITED:
            break;
        }
      }

      const alwaysResult = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      switch (alwaysResult) {
        case RESULTS.UNAVAILABLE:
          console.log(
            'Always location permission is not available on this device.'
          );
          break;
        case RESULTS.DENIED:
          console.log('Always location permission was denied by user.');
          break;
        case RESULTS.GRANTED:
          console.log('Always location permission granted!');
          break;
        case RESULTS.BLOCKED:
          console.log('Always location permission is blocked.');
          console.log(
            '💡 Tip: Go to Settings > Privacy & Security > Location Services to manually upgrade to "Always"'
          );
          handleDeniedPermissionModal();
          break;
        case RESULTS.LIMITED:
          console.log('Always location permission is limited (iOS 14+).');
          break;
      }
    } else if (Platform.OS === 'android') {
      const fineLocationStatus = await check(
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
      if (fineLocationStatus !== RESULTS.GRANTED) {
        const fineLocationResult = await request(
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        );

        switch (fineLocationResult) {
          case RESULTS.UNAVAILABLE:
            console.log('Location permission is not available on this device.');
            return;
          case RESULTS.BLOCKED:
          case RESULTS.DENIED:
            console.log('Location permission was blocked or denied.');
            handleDeniedPermissionModal();
            return;
          case RESULTS.GRANTED:
            console.log(
              'Fine location permission granted! Click again to request background permission.'
            );
            return;
        }
      }

      if (Platform.Version >= 29) {
        const backgroundStatus = await check(
          PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION
        );
        if (backgroundStatus !== RESULTS.GRANTED) {
          const backgroundResult = await request(
            PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION
          );
          switch (backgroundResult) {
            case RESULTS.UNAVAILABLE:
              console.log(
                'Background location permission is not available on this device.'
              );
              break;
            case RESULTS.DENIED:
              console.log('Background location permission was denied by user.');
              break;
            case RESULTS.GRANTED:
              console.log('Background location permission granted!');
              break;
            case RESULTS.BLOCKED:
              console.log('Background location permission is blocked.');
              handleDeniedPermissionModal();
              break;
          }
        } else {
          console.log('Background location permission already granted.');
        }
      }
    }
  } catch (e: any) {
    console.log(
      'Error requesting location permission:',
      e.message,
      e.code,
      e.stack
    );
  }
};

export const getLocationAuthorizationStatus = async () => {
  try {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    const status = await check(permission);

    switch (status) {
      case RESULTS.UNAVAILABLE:
        console.log('Location permission is unavailable on this device.');
        break;
      case RESULTS.DENIED:
        console.log('Location permission is denied.');
        break;
      case RESULTS.GRANTED:
        console.log('Location permission is granted.');
        break;
      case RESULTS.BLOCKED:
        console.log(
          'Location permission is blocked. User can enable it in settings.'
        );
        break;
      case RESULTS.LIMITED:
        console.log('Location permission is limited (iOS 14+).');
        break;
    }
  } catch (e: any) {
    console.log(
      'Error checking location authorization status:',
      e.message,
      e.code
    );
  }
};
