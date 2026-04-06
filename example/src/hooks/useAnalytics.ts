import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Klaviyo, EventName, type Event } from 'klaviyo-react-native-sdk';

export function useAnalytics() {
  // Profile state
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [externalId, setExternalId] = useState('');

  useEffect(() => {
    Klaviyo.getEmail((value: string) => {
      if (value) setEmail(value);
    });

    Klaviyo.getPhoneNumber((value: string) => {
      if (value) setPhoneNumber(value);
    });

    Klaviyo.getExternalId((value: string) => {
      if (value) setExternalId(value);
    });
  }, []);

  // Profile handlers
  const handleSetEmail = () => {
    Klaviyo.setEmail(email);
    console.log('Email set successfully:', email);
  };

  const handleSetPhoneNumber = () => {
    Klaviyo.setPhoneNumber(phoneNumber);
    console.log('Phone number set successfully:', phoneNumber);
  };

  const handleSetExternalId = () => {
    Klaviyo.setExternalId(externalId);
    console.log('External ID set successfully:', externalId);
  };

  const handleSetProfile = () => {
    Klaviyo.setEmail(email);
    Klaviyo.setPhoneNumber(phoneNumber);
    Klaviyo.setExternalId(externalId);
    console.log('Profile updated successfully');
  };

  const handleResetProfile = () => {
    Alert.alert(
      'Reset Profile',
      'Are you sure you want to reset the profile? This will clear all profile data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            Klaviyo.resetProfile();
            setEmail('');
            setPhoneNumber('');
            setExternalId('');
            console.log('Profile reset successfully');
          },
        },
      ]
    );
  };

  // Event handlers — simplified to match the Android SDK sample app pattern
  const handleCreateTestEvent = () => {
    const event: Event = {
      name: 'Test Event',
      properties: { 'System Time': Math.floor(Date.now() / 1000) },
    };
    Klaviyo.createEvent(event);
    console.log('Test event created');
  };

  const handleViewedProduct = () => {
    const event: Event = {
      name: EventName.VIEWED_PRODUCT_METRIC,
      properties: { Product: 'Lily Pad' },
      value: 99.99,
    };
    Klaviyo.createEvent(event);
    console.log('Viewed Product event created');
  };

  return {
    // Profile state
    email,
    setEmail,
    phoneNumber,
    setPhoneNumber,
    externalId,
    setExternalId,

    // Profile handlers
    handleSetEmail,
    handleSetPhoneNumber,
    handleSetExternalId,
    handleSetProfile,
    handleResetProfile,

    // Event handlers
    handleCreateTestEvent,
    handleViewedProduct,
  };
}
