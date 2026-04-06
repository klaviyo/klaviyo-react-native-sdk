import { Alert, Platform, PermissionsAndroid } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  openSettings,
  request,
} from 'react-native-permissions';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export type LocationPermissionState = 'none' | 'inUse' | 'background';

/**
 * Helper to show modal when location permission is denied
 */
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

/**
 * Request location permissions for geofencing
 * On iOS: Requests "When In Use" first, then "Always"
 * On Android: Requests fine location, then background location (Android 10+)
 */
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

/**
 * Check the current location permission state
 * Returns: 'none', 'inUse', or 'background'
 */
export const checkLocationPermissionState =
  async (): Promise<LocationPermissionState> => {
    try {
      if (Platform.OS === 'ios') {
        // Check for Always permission first
        const alwaysStatus = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
        if (
          alwaysStatus === RESULTS.GRANTED ||
          alwaysStatus === RESULTS.LIMITED
        ) {
          return 'background';
        }

        // Check for When In Use permission
        const whenInUseStatus = await check(
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        );
        if (
          whenInUseStatus === RESULTS.GRANTED ||
          whenInUseStatus === RESULTS.LIMITED
        ) {
          return 'inUse';
        }

        return 'none';
      } else if (Platform.OS === 'android') {
        // Check fine location first
        const fineLocationStatus = await check(
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        );
        if (fineLocationStatus !== RESULTS.GRANTED) {
          return 'none';
        }

        // Check background permission (Android 10+)
        if (Platform.Version >= 29) {
          const backgroundStatus = await check(
            PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION
          );
          if (backgroundStatus === RESULTS.GRANTED) {
            return 'background';
          }
        } else {
          // Android < 10 doesn't have separate background permission
          return 'background';
        }

        return 'inUse';
      }

      return 'none';
    } catch (e: any) {
      console.log(
        'Error checking location permission state:',
        e.message,
        e.code,
        e.stack
      );
      return 'none';
    }
  };

// =============================================================================
// Push Notification Permissions
// =============================================================================

/**
 * Check if Firebase is available and properly configured
 * Returns true if Firebase messaging is available, false otherwise
 */
const isFirebaseAvailable = (): boolean => {
  try {
    require('@react-native-firebase/messaging');
    return true;
  } catch (e) {
    console.log('Firebase not available or not configured');
    return false;
  }
};

/**
 * Get Firebase messaging instance if available
 * Returns null if Firebase is not configured
 */
const getMessaging = () => {
  if (!isFirebaseAvailable()) {
    return null;
  }
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return messaging();
  } catch (e) {
    console.error('Error getting Firebase messaging:', e);
    return null;
  }
};

/**
 * Check if Firebase push is configured and available
 * @returns boolean - true if Firebase is properly configured
 */
export const isFirebasePushAvailable = (): boolean => {
  return isFirebaseAvailable();
};

/**
 * Request push notification permissions
 * On iOS: Requests notification permission via Firebase messaging
 * On Android: Requests POST_NOTIFICATIONS permission (Android 13+)
 * @returns Promise<boolean> - true if permission granted, false otherwise
 */
export const requestPushPermission = async (): Promise<boolean> => {
  const messaging = getMessaging();
  if (!messaging) {
    console.warn(
      'Firebase is not configured. Please add google-services.json (Android) or GoogleService-Info.plist (iOS) to enable push notifications.'
    );
    return false;
  }

  try {
    let isAuthorized = false;

    if (Platform.OS === 'android') {
      const androidAuthStatus = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      isAuthorized = androidAuthStatus === 'granted';
    } else if (Platform.OS === 'ios') {
      const iOsAuthStatus = await messaging.requestPermission();
      const AuthorizationStatus = require('@react-native-firebase/messaging')
        .default.AuthorizationStatus;
      isAuthorized =
        iOsAuthStatus === AuthorizationStatus.AUTHORIZED ||
        iOsAuthStatus === AuthorizationStatus.PROVISIONAL;
    }

    if (isAuthorized) {
      console.log('User has notification permissions enabled.');
    } else {
      console.log('User has notification permissions disabled');
    }

    return isAuthorized;
  } catch (e: any) {
    console.log(
      'Error requesting push permission:',
      e.message,
      e.code,
      e.stack
    );
    return false;
  }
};

/**
 * Fetch push token from Firebase and set it to Klaviyo SDK
 * On Android: Fetches FCM token
 * On iOS: Fetches APNs token
 * @returns Promise<string | null> - the push token or null if unavailable
 */
export const fetchAndSetPushToken = async (): Promise<string | null> => {
  const messaging = getMessaging();
  if (!messaging) {
    console.log('Firebase not configured, skipping token fetch');
    return null;
  }

  try {
    let deviceToken: string | null = null;
    if (Platform.OS === 'android') {
      deviceToken = await messaging.getToken();
      console.log('FCM Token:', deviceToken);
    } else {
      deviceToken = await messaging.getAPNSToken();
      console.log('APNs Token:', deviceToken);
    }

    if (deviceToken != null && deviceToken.length > 0) {
      Klaviyo.setPushToken(deviceToken);
      return deviceToken;
    }

    return null;
  } catch (error) {
    console.error('Error in fetchAndSetPushToken:', error);
    return null;
  }
};

/**
 * Check if push notifications are authorized
 * @returns Promise<boolean> - true if authorized, false otherwise
 */
export const checkPushPermissionStatus = async (): Promise<boolean> => {
  const messaging = getMessaging();
  if (!messaging) {
    return false;
  }

  try {
    const status = await messaging.hasPermission();
    const AuthorizationStatus = require('@react-native-firebase/messaging')
      .default.AuthorizationStatus;
    return status === AuthorizationStatus.AUTHORIZED;
  } catch (e: any) {
    console.log(
      'Error checking push permission status:',
      e.message,
      e.code,
      e.stack
    );
    return false;
  }
};
