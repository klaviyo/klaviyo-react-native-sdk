import { Alert, Linking, Platform, PermissionsAndroid } from 'react-native';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export type LocationPermissionState = 'none' | 'inUse' | 'background';

// Module-scope memoization so we don't repeatedly `require()` or log.
let _firebaseAvailable: boolean | null = null;

// Lazily capture Firebase's AuthorizationStatus enum on first use. Same
// motivation as `getMessagingInstance` — avoid paying the `require()` cost
// (and noisy try/catch path) on every permission check. Undefined means
// Firebase isn't linked; callers should short-circuit before reaching here,
// but the guard keeps this helper safe to call in isolation.
type AuthorizationStatusEnum = Record<string, number>;
let _authorizationStatus: AuthorizationStatusEnum | undefined;
let _authorizationStatusLoaded = false;
const getAuthorizationStatus = (): AuthorizationStatusEnum | undefined => {
  if (!_authorizationStatusLoaded) {
    try {
      _authorizationStatus =
        require('@react-native-firebase/messaging').default.AuthorizationStatus;
    } catch {
      _authorizationStatus = undefined;
    }
    _authorizationStatusLoaded = true;
  }
  return _authorizationStatus;
};

// Deep-link to the app's own Settings page. RN's Linking.openSettings()
// uses UIApplication.openSettingsURLString on iOS and the app detail
// settings intent on Android.
const openAppSettings = () => {
  Linking.openSettings();
};

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
        onPress: () => openAppSettings(),
      },
    ]
  );
};

/**
 * Request location permissions for geofencing. Both platforms use a
 * two-tap flow — tap 1 requests foreground access, tap 2 upgrades to
 * background. On iOS the split is mandatory (iOS silently blocks
 * auto-chained upgrades). On Android it's by choice: auto-chaining would
 * make the foreground grant immediately trigger a settings redirect for
 * background access (Android 11+), which is a jarring UX for a demo.
 *
 * First call: requests foreground (WhenInUse / ACCESS_FINE_LOCATION) and
 * returns. Second call (with foreground already granted): requests
 * background (Always / ACCESS_BACKGROUND_LOCATION).
 */
export const requestLocationPermission = async () => {
  try {
    if (Platform.OS === 'ios') {
      const whenInUseStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      const hasWhenInUse =
        whenInUseStatus === RESULTS.GRANTED ||
        whenInUseStatus === RESULTS.LIMITED;

      if (!hasWhenInUse) {
        // First tap: request WhenInUse. Don't chain — let the user come back
        // and tap again to request Always.
        const whenInUseResult = await request(
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        );
        switch (whenInUseResult) {
          case RESULTS.UNAVAILABLE:
            console.log('Location permission is not available on this device.');
            return;
          case RESULTS.BLOCKED:
            handleDeniedPermissionModal();
            return;
          case RESULTS.DENIED:
          case RESULTS.GRANTED:
          case RESULTS.LIMITED:
            return;
        }
      }

      // Second tap: WhenInUse already granted → upgrade to Always.
      const alwaysResult = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      switch (alwaysResult) {
        case RESULTS.UNAVAILABLE:
          console.log(
            'Always location permission is not available on this device.'
          );
          break;
        case RESULTS.GRANTED:
          break;
        case RESULTS.DENIED:
        case RESULTS.BLOCKED:
          // iOS won't re-prompt for Always after WhenInUse was granted —
          // the user must change it in Settings manually.
          handleDeniedPermissionModal();
          break;
        case RESULTS.LIMITED:
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
            // Intentional: return after the foreground grant so the user
            // taps again to request background. See function JSDoc above.
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
  } catch (error) {
    console.error('Error requesting location permission:', error);
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
    } catch (error) {
      console.error('Error checking location permission state:', error);
      return 'none';
    }
  };

// =============================================================================
// Push Notification Permissions
// =============================================================================
//
// NOTE FOR INTEGRATORS: the Firebase-availability gating below
// (`isFirebasePushAvailable`, `getMessagingInstance`, and the `if (!messaging)
// return null` short-circuits in request/fetch helpers) is a convenience for
// running this example app without Firebase config files in place. It lets
// anyone clone the repo, `yarn install`, and launch the app to explore the
// UI — push features just stay dormant until they drop in their own
// `GoogleService-Info.plist` (iOS) / `google-services.json` (Android).
//
// In a real app, Firebase is a prerequisite for push — you don't need this
// graceful-degradation layer. Call `messaging()` directly and let it throw
// loudly if the config is missing; that's a build-time setup bug you want
// to surface, not hide.

/**
 * Check if Firebase push is configured and available.
 *
 * This probes for actual initialization, not just module resolvability. With
 * autolinking + unconditionally-linked iOS pods, the module always resolves
 * even when `GoogleService-Info.plist` is missing. In that case the native
 * `[FIRApp configure]` step is skipped, and any call into the messaging API
 * (e.g. `getToken()`) will throw "No Firebase App '[DEFAULT]' has been
 * created". We surface that here so the UI can degrade gracefully instead of
 * silently swallowing errors later.
 *
 * Calling `messaging()` itself throws when no default app exists (see
 * `@react-native-firebase/app/lib/internal/registry/app.js`), so the try/catch
 * captures both "module missing" and "not initialized" failure modes.
 * Accessing `.app` (a property on `FirebaseModule`) is a belt-and-suspenders
 * check in case the proxy ever returns a stub.
 *
 * Result is memoized on first call — we only probe once and avoid repeatedly
 * logging the "Firebase not available" message on every invocation.
 * @returns boolean - true if Firebase is properly configured AND initialized
 */
export const isFirebasePushAvailable = (): boolean => {
  if (_firebaseAvailable === null) {
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      _firebaseAvailable = !!messaging().app;
    } catch {
      _firebaseAvailable = false;
    }
  }
  return _firebaseAvailable;
};

/**
 * Get Firebase messaging instance if available
 * Returns null if Firebase is not configured
 */
export const getMessagingInstance = () => {
  if (!isFirebasePushAvailable()) {
    return null;
  }
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return messaging();
  } catch (error) {
    console.error('Error getting Firebase messaging:', error);
    return null;
  }
};

/**
 * Request push notification permissions
 * On iOS: Requests notification permission via Firebase messaging
 * On Android: Requests POST_NOTIFICATIONS permission (Android 13+)
 * @returns Promise<boolean> - true if permission granted, false otherwise
 */
export const requestPushPermission = async (): Promise<boolean> => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    console.warn(
      'Firebase is not configured. Please add google-services.json (Android) or GoogleService-Info.plist (iOS) to enable push notifications.'
    );
    return false;
  }

  try {
    let isAuthorized = false;

    if (Platform.OS === 'android') {
      // POST_NOTIFICATIONS is only a runtime permission on Android 13+ (API 33).
      // Older versions auto-grant notifications — requesting the permission
      // there returns `never_ask_again`, which would look like a denial here.
      if (Platform.Version >= 33) {
        const androidAuthStatus = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        isAuthorized = androidAuthStatus === 'granted';
      } else {
        isAuthorized = true;
      }
    } else if (Platform.OS === 'ios') {
      const iOsAuthStatus = await messaging.requestPermission();
      const AuthorizationStatus = getAuthorizationStatus();
      isAuthorized =
        !!AuthorizationStatus &&
        (iOsAuthStatus === AuthorizationStatus.AUTHORIZED ||
          iOsAuthStatus === AuthorizationStatus.PROVISIONAL);
    }

    if (isAuthorized) {
      console.log('User has notification permissions enabled.');
    } else {
      console.log('User has notification permissions disabled');
    }

    return isAuthorized;
  } catch (error) {
    console.error('Error requesting push permission:', error);
    return false;
  }
};

/**
 * Fetch push token from Firebase and set it on the Klaviyo SDK.
 * Android: FCM registration token via messaging().getToken().
 * iOS: APNs device token via messaging().getAPNSToken(). Firebase populates
 *   it after iOS fires didRegisterForRemoteNotificationsWithDeviceToken,
 *   which is triggered by messaging().requestPermission() when the user
 *   grants notifications. On cold start pre-permission, getAPNSToken
 *   returns null — the Request Push Permission button flow calls this
 *   function again post-grant to populate it.
 *
 * @returns Promise<string | null> - the push token or null if unavailable
 */
export const fetchAndSetPushToken = async (): Promise<string | null> => {
  const messaging = getMessagingInstance();
  if (!messaging) return null;

  try {
    const deviceToken =
      Platform.OS === 'android'
        ? await messaging.getToken()
        : await messaging.getAPNSToken();

    if (deviceToken != null && deviceToken.length > 0) {
      Klaviyo.setPushToken(deviceToken);
      return deviceToken;
    }
    return null;
  } catch (error) {
    console.error('[PermissionHelper] error in fetchAndSetPushToken:', error);
    return null;
  }
};

/**
 * Check if push notifications are authorized
 * @returns Promise<boolean> - true if authorized, false otherwise
 */
export const checkPushPermissionStatus = async (): Promise<boolean> => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    return false;
  }

  try {
    const status = await messaging.hasPermission();
    const AuthorizationStatus = getAuthorizationStatus();
    if (!AuthorizationStatus) {
      return false;
    }
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('Error checking push permission status:', error);
    return false;
  }
};
