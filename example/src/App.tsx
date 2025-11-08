import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Linking,
  Alert,
  Platform,
  SafeAreaView,
  Text,
} from 'react-native';
import {
  Klaviyo,
  type Event,
  type FormConfiguration,
} from 'klaviyo-react-native-sdk';
import { styles } from './Styles';
import { getRandomMetric } from './RandomGenerators';
import { SectionHeader } from './components/SectionHeader';
import { ProfileTextField } from './components/ProfileTextField';
import { ActionButton } from './components/ActionButton';
import { ToggleButtons } from './components/ToggleButtons';
import {
  requestLocationPermission,
  checkLocationPermissionState,
  type LocationPermissionState,
} from './PermissionHelper';

export default function App() {
  // Profile state
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [externalId, setExternalId] = useState('');

  // Feature state
  const [pushToken, setPushToken] = useState('');
  const [formsRegistered, setFormsRegistered] = useState(false);
  const [geofencingRegistered, setGeofencingRegistered] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>('none');

  // Helper to refresh location permission state
  const refreshLocationPermission = async () => {
    const state = await checkLocationPermissionState();
    setLocationPermission(state);
  };

  // Initialize SDK and load current state on mount
  useEffect(() => {
    // Initialize the SDK with public key
    Klaviyo.initialize('TRJ3wp');

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

    // Check initial location permission state
    refreshLocationPermission().then(() => {
      console.log('Fetched initial location permission state');
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
    // Set all profile fields at once
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
        // Test boolean/number properties in event
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

  // In-App Forms handlers
  const handleRegisterForms = () => {
    // Optional: configure form session timeout, default 1 hour
    const config: FormConfiguration = { sessionTimeoutDuration: 60 * 60 };
    Klaviyo.registerForInAppForms(config);
    setFormsRegistered(true);
    console.log('Registered for in-app forms');
  };

  const handleUnregisterForms = () => {
    Klaviyo.unregisterFromInAppForms();
    setFormsRegistered(false);
    console.log('Unregistered from in-app forms');
  };

  // Geofencing handlers
  const handleRegisterGeofencing = () => {
    Klaviyo.registerGeofencing();
    setGeofencingRegistered(true);
    console.log('Registered for geofencing');
  };

  const handleUnregisterGeofencing = () => {
    Klaviyo.unregisterGeofencing();
    setGeofencingRegistered(false);
    console.log('Unregistered from geofencing');
  };

  const handleGetCurrentGeofences = () => {
    // Note: this @internal method is intended only for demonstration and debugging purposes
    Klaviyo.getCurrentGeofences(
      (result: {
        geofences: Array<{
          identifier: string;
          latitude: number;
          longitude: number;
          radius: number;
        }>;
      }) => {
        const { geofences } = result;
        console.log('Current geofences:', JSON.stringify(geofences, null, 2));

        if (geofences.length === 0) {
          Alert.alert(
            'Current Geofences',
            'No geofences are currently being monitored.',
            [{ text: 'OK' }]
          );
        } else {
          const geofencesList = geofences
            .map(
              (g, index) =>
                `${index + 1}. ${g.identifier}\n   Center: (${g.latitude.toFixed(6)}, ${g.longitude.toFixed(6)})\n   Radius: ${g.radius.toFixed(2)}m`
            )
            .join('\n\n');

          Alert.alert(
            `Current Geofences (${geofences.length})`,
            geofencesList,
            [{ text: 'OK' }]
          );
        }
      }
    );
  };

  const handleRequestLocationPermission = async () => {
    await requestLocationPermission();
    // Refresh permission state after requesting
    await refreshLocationPermission();
  };

  // Push notifications handlers
  const handleRequestPushPermission = () => {
    // Note: This is a placeholder. In a real app, you would use a push notification
    // library like @react-native-firebase/messaging or react-native-push-notification
    // to request push permissions. The Klaviyo SDK will handle the token registration
    // when you call setPushToken.
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
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
          <View style={styles.actionButtonRow}>
            <ActionButton
              title="Set Profile"
              onPress={handleSetProfile}
              disabled={
                !email.trim() && !phoneNumber.trim() && !externalId.trim()
              }
              inRow
            />
            <ActionButton
              title="Reset Profile"
              onPress={handleResetProfile}
              destructive
              inRow
            />
          </View>
        </View>

        {/* Events Section */}
        <View style={styles.section}>
          <SectionHeader title="Events" />
          <View style={styles.actionButtonRow}>
            <ActionButton
              title="Test Event"
              onPress={handleCreateTestEvent}
              inRow
            />
            <ActionButton
              title="Viewed Product"
              onPress={handleViewedProduct}
              inRow
            />
          </View>
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
            leftDisabled={formsRegistered}
            rightDisabled={!formsRegistered}
          />
        </View>

        {/* Geofencing & Location Section */}
        <View style={styles.section}>
          <SectionHeader title="Geofencing & Location" />
          {locationPermission === 'none' && (
            <ActionButton
              title="Request Location Permission"
              onPress={handleRequestLocationPermission}
            />
          )}
          {locationPermission === 'inUse' && (
            <ActionButton
              title="Request Background Permission"
              onPress={handleRequestLocationPermission}
            />
          )}
          {locationPermission === 'background' && (
            <View style={styles.permissionGrantedContainer}>
              <Text style={styles.permissionGrantedText}>
                Background Permission Granted
              </Text>
            </View>
          )}
          <ToggleButtons
            leftLabel="Register"
            rightLabel="Unregister"
            isLeftActive={geofencingRegistered}
            onLeftPress={handleRegisterGeofencing}
            onRightPress={handleUnregisterGeofencing}
            leftDisabled={geofencingRegistered}
            rightDisabled={!geofencingRegistered}
          />
          {geofencingRegistered && (
            <ActionButton
              title="Get Current Geofences"
              onPress={handleGetCurrentGeofences}
              withTopSpacing
            />
          )}
        </View>

        {/* Push Notifications Section */}
        <View style={styles.section}>
          <SectionHeader title="Push Notifications" />
          <ActionButton
            title="Request Push Permission"
            onPress={handleRequestPushPermission}
          />
          <View style={styles.pushTokenContainer}>
            <Text style={styles.pushTokenLabel}>Push Token</Text>
            <Text
              style={[
                styles.pushTokenText,
                !pushToken && styles.pushTokenEmpty,
              ]}
            >
              {pushToken || 'No push token available'}
            </Text>
          </View>
          {Platform.OS === 'ios' && (
            <ActionButton
              title="Set Badge Count"
              onPress={handleSetBadgeCount}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
