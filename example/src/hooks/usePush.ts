import { useState, useEffect } from 'react';
import { Klaviyo } from 'klaviyo-react-native-sdk';
import {
  requestPushPermission,
  fetchAndSetPushToken,
  checkPushPermissionStatus,
  isFirebasePushAvailable,
} from '../PermissionHelper';

export function usePush() {
  const [pushToken, setPushToken] = useState('');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] =
    useState(false);

  useEffect(() => {
    // Check initial push permission state
    checkPushPermissionStatus().then((isAuthorized) => {
      setPushNotificationsEnabled(isAuthorized);
    });

    // Fetch initial push token
    fetchAndSetPushToken().then((token) => {
      if (token) {
        setPushToken(token);
      }
      console.log('Fetched initial push token');
    });
  }, []);

  const handleRequestPushPermission = async () => {
    const isAuthorized = await requestPushPermission();
    setPushNotificationsEnabled(isAuthorized);

    if (isAuthorized) {
      // Fetch token after requesting permission
      const token = await fetchAndSetPushToken();
      if (token) {
        setPushToken(token);
      }
    }
  };

  const handleSetBadgeCount = () => {
    const randomBadgeCount = Math.floor(Math.random() * 10);
    Klaviyo.setBadgeCount(randomBadgeCount);
    console.log('Badge count updated:', randomBadgeCount);
  };

  return {
    pushToken,
    pushNotificationsEnabled,
    isFirebaseAvailable: isFirebasePushAvailable,
    handleRequestPushPermission,
    handleSetBadgeCount,
  };
}
