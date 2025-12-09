import { useEffect } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Text,
  Platform,
  Linking,
} from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';
import { styles } from './Styles';
import { SectionHeader } from './components/SectionHeader';
import { ProfileTextField } from './components/ProfileTextField';
import { ActionButton } from './components/ActionButton';
import { ToggleButtons } from './components/ToggleButtons';
import { useAnalytics } from './hooks/useAnalytics';
import { useForms } from './hooks/useForms';
import { useLocation } from './hooks/useLocation';
import { usePush } from './hooks/usePush';

export default function App() {
  // Initialize SDK and register for features on mount
  useEffect(() => {
    Klaviyo.initialize('TRJ3wp');

    // Register for in-app forms
    Klaviyo.registerForInAppForms();

    // Register for geofencing
    Klaviyo.registerGeofencing();

    // Deep linking handler
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

  // Feature hooks (pass true since we register in useEffect above)
  const analytics = useAnalytics();
  const forms = useForms(true);
  const location = useLocation(true);
  const push = usePush();

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
            value={analytics.externalId}
            onChangeText={analytics.setExternalId}
            onSetPress={analytics.handleSetExternalId}
            placeholder="Enter external ID"
          />
          <ProfileTextField
            label="Email Address"
            value={analytics.email}
            onChangeText={analytics.setEmail}
            onSetPress={analytics.handleSetEmail}
            placeholder="user@example.com"
            keyboardType="email-address"
          />
          <ProfileTextField
            label="Phone Number"
            value={analytics.phoneNumber}
            onChangeText={analytics.setPhoneNumber}
            onSetPress={analytics.handleSetPhoneNumber}
            placeholder="+1234567890"
            keyboardType="phone-pad"
          />
          <View style={styles.actionButtonRow}>
            <ActionButton
              title="Set Profile"
              onPress={analytics.handleSetProfile}
              disabled={
                !analytics.email.trim() &&
                !analytics.phoneNumber.trim() &&
                !analytics.externalId.trim()
              }
              inRow
            />
            <ActionButton
              title="Reset Profile"
              onPress={analytics.handleResetProfile}
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
              onPress={analytics.handleCreateTestEvent}
              inRow
            />
            <ActionButton
              title="Viewed Product"
              onPress={analytics.handleViewedProduct}
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
            isLeftActive={forms.formsRegistered}
            onLeftPress={forms.handleRegisterForms}
            onRightPress={forms.handleUnregisterForms}
            leftDisabled={forms.formsRegistered}
            rightDisabled={!forms.formsRegistered}
          />
        </View>

        {/* Geofencing & Location Section */}
        <View style={styles.section}>
          <SectionHeader title="Geofencing & Location" />
          {location.locationPermission === 'none' && (
            <ActionButton
              title="Request Location Permission"
              onPress={location.handleRequestLocationPermission}
            />
          )}
          {location.locationPermission === 'inUse' && (
            <ActionButton
              title="Request Background Permission"
              onPress={location.handleRequestLocationPermission}
            />
          )}
          {location.locationPermission === 'background' && (
            <View style={styles.permissionGrantedContainer}>
              <Text style={styles.permissionGrantedText}>
                Background Permission Granted
              </Text>
            </View>
          )}
          <ToggleButtons
            leftLabel="Register"
            rightLabel="Unregister"
            isLeftActive={location.geofencingRegistered}
            onLeftPress={location.handleRegisterGeofencing}
            onRightPress={location.handleUnregisterGeofencing}
            leftDisabled={location.geofencingRegistered}
            rightDisabled={!location.geofencingRegistered}
          />
          {location.geofencingRegistered && (
            <ActionButton
              title="Get Current Geofences"
              onPress={location.handleGetCurrentGeofences}
              withTopSpacing
            />
          )}
        </View>

        {/* Push Notifications Section */}
        <View style={styles.section}>
          <SectionHeader title="Push Notifications" />
          <ActionButton
            title="Request Push Permission"
            onPress={push.handleRequestPushPermission}
          />
          <View style={styles.pushTokenContainer}>
            <Text style={styles.pushTokenLabel}>Push Token</Text>
            <Text
              style={[
                styles.pushTokenText,
                !push.pushToken && styles.pushTokenEmpty,
              ]}
            >
              {push.pushToken || 'No push token available'}
            </Text>
          </View>
          {Platform.OS === 'ios' && (
            <ActionButton
              title="Set Badge Count"
              onPress={push.handleSetBadgeCount}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
