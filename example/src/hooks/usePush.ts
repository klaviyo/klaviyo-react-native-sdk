import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export function usePush() {
  const [pushToken, setPushToken] = useState('');

  useEffect(() => {
    Klaviyo.getPushToken((value: string) => {
      if (value) setPushToken(value);
    });
  }, []);

  const handleRequestPushPermission = () => {
    Alert.alert(
      'Push Notifications',
      'Push notification permission requests should be handled by your push notification library (e.g., Firebase). The SDK will automatically register the token when available.',
      [{ text: 'OK' }]
    );
  };

  const handleSetBadgeCount = () => {
    const randomBadgeCount = Math.floor(Math.random() * 10);
    Klaviyo.setBadgeCount(randomBadgeCount);
    console.log('Badge count updated:', randomBadgeCount);
  };

  return {
    pushToken,
    handleRequestPushPermission,
    handleSetBadgeCount,
  };
}
