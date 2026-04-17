import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
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

    // Try to fetch a cached token. On a first-ever launch this returns null
    // because APNs registration hasn't happened yet (that's triggered by the
    // user granting permission via messaging().requestPermission()). On
    // subsequent launches where permission is already granted, this returns
    // the cached token immediately.
    fetchAndSetPushToken().then((token) => {
      if (token) setPushToken(token);
    });

    const messaging = getMessagingInstance();
    if (!messaging) return;

    // onTokenRefresh delivers the FCM registration token. On Android that's
    // what Klaviyo expects and what we want to display. On iOS, Klaviyo uses
    // the APNs device token (returned by getAPNSToken), NOT the FCM token —
    // so on iOS we re-fetch APNs when Firebase signals a token change and
    // ignore the FCM token itself. The refresh also covers server-initiated
    // token rotation and the "APNs ready" moment after the user grants
    // notification permission on first launch.
    const unsubscribeTokenRefresh = messaging.onTokenRefresh(
      (fcmToken: string) => {
        if (Platform.OS === 'android') {
          if (fcmToken) {
            Klaviyo.setPushToken(fcmToken);
            setPushToken(fcmToken);
          }
        } else {
          fetchAndSetPushToken().then((apnsToken) => {
            if (apnsToken) setPushToken(apnsToken);
          });
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
