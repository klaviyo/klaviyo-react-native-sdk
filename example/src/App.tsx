import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Linking,
  Alert,
  Platform,
  SafeAreaView,
  Text,
} from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';
import { styles } from './Styles';
import {
  initialize,
  setEmailValue,
  setPhoneNumberValue,
  setExternalIdValue,
  resetProfile,
  sendRandomEvent,
  sendViewedProductEvent,
  registerForInAppForms,
  unregisterFromInAppForms,
  setBadgeCount,
} from './KlaviyoReactWrapper';
import { SectionHeader } from './components/SectionHeader';
import { ProfileTextField } from './components/ProfileTextField';
import { ActionButton } from './components/ActionButton';
import { ToggleButtons } from './components/ToggleButtons';

export default function App() {
  // Profile state
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [externalId, setExternalId] = useState('');

  // Feature state
  const [pushToken, setPushToken] = useState('');
  const [formsRegistered, setFormsRegistered] = useState(false);

  // Initialize SDK and load current state on mount
  useEffect(() => {
    initialize();

    // Load current profile values from SDK
    Klaviyo.getEmail((value: string) => {
      if (value) setEmail(value);
    });

    Klaviyo.getPhoneNumber((value: string) => {
      if (value) setPhoneNumber(value);
    });

    Klaviyo.getExternalId((value: string) => {
      if (value) setExternalId(value);
    });

    Klaviyo.getPushToken((value: string) => {
      if (value) setPushToken(value);
    });

    // Set up deep linking handler
    const handleUrl = (url: string) => {
      if (Klaviyo.handleUniversalTrackingLink(url)) {
        console.log('Event Listener: Klaviyo tracking link', url);
        return;
      }
      console.log('Navigate to url', url);
    };

    Linking.getInitialURL().then((url) => {
      console.log('Initial Url: url', url);
      if (url) {
        handleUrl(url);
      }
    });

    Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });
  }, []);

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Profile handlers
  const handleSetEmail = () => {
    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setEmailValue(email);
    Alert.alert('Success', 'Email set successfully!');
  };

  const handleSetPhoneNumber = () => {
    setPhoneNumberValue(phoneNumber);
    Alert.alert('Success', 'Phone number set successfully!');
  };

  const handleSetExternalId = () => {
    setExternalIdValue(externalId);
    Alert.alert('Success', 'External ID set successfully!');
  };

  const handleSetProfile = () => {
    // Set all profile fields at once
    let updated = false;

    if (email.trim()) {
      if (!isValidEmail(email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
      setEmailValue(email);
      updated = true;
    }

    if (phoneNumber.trim()) {
      setPhoneNumberValue(phoneNumber);
      updated = true;
    }

    if (externalId.trim()) {
      setExternalIdValue(externalId);
      updated = true;
    }

    if (updated) {
      Alert.alert('Success', 'Profile updated successfully!');
    } else {
      Alert.alert('No Changes', 'Please enter at least one profile field.');
    }
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
            resetProfile();
            setEmail('');
            setPhoneNumber('');
            setExternalId('');
            Alert.alert('Success', 'Profile reset successfully!');
          },
        },
      ]
    );
  };

  // Event handlers
  const handleCreateTestEvent = () => {
    sendRandomEvent();
    Alert.alert('Success', 'Test event created!');
  };

  const handleViewedProduct = () => {
    sendViewedProductEvent();
    Alert.alert('Success', 'Viewed Product event created!');
  };

  // In-App Forms handlers
  const handleRegisterForms = () => {
    registerForInAppForms();
    setFormsRegistered(true);
    Alert.alert('Success', 'Registered for in-app forms!');
  };

  const handleUnregisterForms = () => {
    unregisterFromInAppForms();
    setFormsRegistered(false);
    Alert.alert('Success', 'Unregistered from in-app forms!');
  };

  // Push notifications handler
  const handleSetBadgeCount = () => {
    setBadgeCount();
    Alert.alert('Success', 'Badge count updated!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.section}>
          <SectionHeader title="Profile" />
          <ProfileTextField
            label="External ID"
            value={externalId}
            onChangeText={setExternalId}
            onSetPress={handleSetExternalId}
            placeholder="Enter external ID"
          />
          <ProfileTextField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            onSetPress={handleSetEmail}
            placeholder="user@example.com"
            keyboardType="email-address"
          />
          <ProfileTextField
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onSetPress={handleSetPhoneNumber}
            placeholder="+1234567890"
            keyboardType="phone-pad"
          />
          <ActionButton
            title="Set Profile"
            onPress={handleSetProfile}
            disabled={!email.trim() && !phoneNumber.trim() && !externalId.trim()}
          />
          <ActionButton
            title="Reset Profile"
            onPress={handleResetProfile}
            destructive
          />
        </View>

        {/* Events Section */}
        <View style={styles.section}>
          <SectionHeader title="Events" />
          <ActionButton title="Create Test Event" onPress={handleCreateTestEvent} />
          <ActionButton title="Viewed Product" onPress={handleViewedProduct} />
        </View>

        {/* In-App Forms Section */}
        <View style={styles.section}>
          <SectionHeader title="In-App Forms" />
          <ToggleButtons
            leftLabel="Register"
            rightLabel="Unregister"
            isLeftActive={formsRegistered}
            onLeftPress={handleRegisterForms}
            onRightPress={handleUnregisterForms}
          />
        </View>

        {/* Push Notifications Section */}
        <View style={styles.section}>
          <SectionHeader title="Push Notifications" />
          <View style={styles.pushTokenContainer}>
            <Text style={styles.pushTokenLabel}>Push Token</Text>
            <Text style={[styles.pushTokenText, !pushToken && styles.pushTokenEmpty]}>
              {pushToken || 'No push token available'}
            </Text>
          </View>
          {Platform.OS === 'ios' && (
            <ActionButton title="Set Badge Count" onPress={handleSetBadgeCount} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
