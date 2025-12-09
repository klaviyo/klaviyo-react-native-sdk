import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Klaviyo, type Event } from 'klaviyo-react-native-sdk';
import { getRandomMetric } from '../RandomGenerators';

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

  // Event handlers
  const handleCreateTestEvent = () => {
    const event: Event = {
      name: getRandomMetric(),
      value: Math.floor(Math.random() * 100),
      properties: {
        testKey: 'sample',
        booleanTrue: true,
        booleanFalse: false,
        numberZero: 0,
        numberOne: 1,
        decimal: 1.23456789,
      },
    };
    Klaviyo.createEvent(event);
    console.log('Test event created');
  };

  const handleViewedProduct = () => {
    Klaviyo.createEvent({
      name: 'Viewed Product',
      value: Math.floor(Math.random() * 100),
      properties: {
        ProductName: 'Sample Product',
        ProductID: 'SAMPLE-123',
        SKU: 'SKU-SAMPLE-001',
        Categories: ['Example', 'Demo'],
        Brand: 'Klaviyo',
        Price: 29.99,
        CompareAtPrice: 39.99,
      },
    });
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
