import { useState, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';
import {
  requestPushPermission,
  fetchAndSetPushToken,
  checkPushPermissionStatus,
  isFirebasePushAvailable,
  getMessagingInstance,
} from '../PermissionHelper';

export function usePush() {
  const [pushToken, setPushToken] = useState('');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] =
    useState(false);
  const [badgeCount, setBadgeCount] = useState('0');
  // Compute once at hook-mount time. The underlying helper is memoized, but
  // exposing a boolean (rather than a function reference) avoids re-invocation
  // on every render and keeps the public shape consistent with other hooks.
  const [isFirebaseAvailable] = useState(() => isFirebasePushAvailable());

  useEffect(() => {
    // Check initial push permission state.
    checkPushPermissionStatus().then((isAuthorized) => {
      setPushNotificationsEnabled(isAuthorized);
    });

    // Re-check permission whenever the app returns to the foreground — the
    // user may have toggled the setting from the OS Settings app. The Klaviyo
    // SDK handles the permission-change side effects internally on resume;
    // this listener is purely to keep the example UI in sync.
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          checkPushPermissionStatus().then(setPushNotificationsEnabled);
        }
      }
    );

    // Try to fetch a cached token. Returns null on a first-ever launch where
    // APNs registration (iOS) or FCM token generation (Android) hasn't
    // completed yet; on subsequent launches it returns the cached token
    // immediately. Note: token availability is independent of notification
    // permission — on iOS, APNs delivers a token as long as
    // registerForRemoteNotifications() has been called and the device has
    // network connectivity, whether or not the user has granted permission
    // to display notifications.
    fetchAndSetPushToken().then((token) => {
      if (token) setPushToken(token);
    });

    const messaging = getMessagingInstance();
    if (!messaging) {
      return () => {
        appStateSubscription.remove();
      };
    }

    // onTokenRefresh delivers the FCM registration token. On Android that's
    // what Klaviyo expects and what we want to display. On iOS, Klaviyo uses
    // the APNs device token (returned by getAPNSToken), NOT the FCM token —
    // so on iOS we re-fetch APNs when Firebase signals a token change and
    // ignore the FCM token itself. The refresh also covers server-initiated
    // token rotation and the "APNs ready" moment after the user grants
    // notification permission on first launch.
    const unsubscribeTokenRefresh = messaging.onTokenRefresh(
      (fcmToken: string) => {
        if (Platform.OS === 'ios') {
          fetchAndSetPushToken().then((apnsToken) => {
            if (apnsToken) setPushToken(apnsToken);
          });
        } else if (fcmToken) {
          Klaviyo.setPushToken(fcmToken);
          setPushToken(fcmToken);
        }
      }
    );

    const unsubscribeMessage = messaging.onMessage(
      (remoteMessage: { messageId?: string }) => {
        console.log('[usePush] foreground message:', remoteMessage?.messageId);
      }
    );

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeMessage();
      appStateSubscription.remove();
    };
  }, []);

  const handleRequestPushPermission = async () => {
    const isAuthorized = await requestPushPermission();
    setPushNotificationsEnabled(isAuthorized);
    const token = await fetchAndSetPushToken();
    if (token) setPushToken(token);
  };

  const handleSetBadgeCount = () => {
    const parsed = parseInt(badgeCount, 10);
    const count = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    Klaviyo.setBadgeCount(count);
  };

  // Manually re-fetch the token from Firebase and hand it to the Klaviyo SDK.
  // Useful for demo/debugging — the SDK call happens automatically on mount
  // and after permission grant too.
  const handleSetPushToken = async () => {
    const token = await fetchAndSetPushToken();
    if (token) setPushToken(token);
  };

  return {
    pushToken,
    pushNotificationsEnabled,
    isFirebaseAvailable,
    badgeCount,
    setBadgeCount,
    handleRequestPushPermission,
    handleSetBadgeCount,
    handleSetPushToken,
  };
}
