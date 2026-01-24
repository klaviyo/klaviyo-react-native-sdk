import { Alert, Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  openSettings,
  request,
} from 'react-native-permissions';

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
