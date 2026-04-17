// React / React Native
import { useEffect, useMemo } from 'react';
import {
  View,
  SectionList,
  SafeAreaView,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';

// Klaviyo SDK
import { Klaviyo } from 'klaviyo-react-native-sdk';
import type { Geofence } from 'klaviyo-react-native-sdk';

// Local hooks
import { useAnalytics } from './hooks/useAnalytics';
import { useForms } from './hooks/useForms';
import { useLocation, geofenceModalStyles } from './hooks/useLocation';
import { usePush } from './hooks/usePush';

// Local components / styles
import { styles } from './Styles';
import { SectionHeader } from './components/SectionHeader';
import { ProfileTextField } from './components/ProfileTextField';
import { Collapsible } from './components/Collapsible';
import { ActionButton } from './components/ActionButton';
import { ToggleButtons } from './components/ToggleButtons';

// Environment — copy example/.env.example to example/.env and fill in your key.
// Run `yarn install` in example/ after adding react-native-dotenv, then restart Metro.
import { KLAVIYO_API_KEY } from '@env';

// react-native-dotenv inlines env vars at build time. Fail fast if the key is
// missing or still set to the placeholder — the example app is useless without
// one, and a clear module-load error beats silently broken SDK calls.
const PLACEHOLDER_API_KEY = 'YOUR_KLAVIYO_PUBLIC_API_KEY';
const API_KEY = KLAVIYO_API_KEY ?? '';
if (API_KEY.length === 0 || API_KEY === PLACEHOLDER_API_KEY) {
  throw new Error(
    'Klaviyo API key not configured. Copy example/.env.example to example/.env and set KLAVIYO_API_KEY to your public API key.'
  );
}

// Initialize synchronously at module load so native SDK calls from hook
// useEffects (which fire before App's useEffect) land after the bridge has
// been told about the public key.
Klaviyo.initialize(API_KEY);

export default function App() {
  const analytics = useAnalytics();
  const forms = useForms();
  const location = useLocation();
  const push = usePush();

  useEffect(() => {
    // Deep linking handler
    const handleUrl = (url: string) => {
      if (Klaviyo.handleUniversalTrackingLink(url)) {
        // Klaviyo is handling a universal click tracking link
        console.log('[App] Klaviyo tracking link:', url);
        return;
      }

      // If false, Klaviyo didn't handle this URL — route normally
      // e.g., navigate using React Navigation: navigation.navigate(parseUrl(url))
      console.log('Navigate to url', url);
    };

    // Handle cold-start deep links (app opened via URL)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    // Listen for deep link events while the app is running; return cleanup to prevent listener leak
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // SectionList data — each section corresponds to a feature domain (L11).
  // Each section has a single item (the section key) whose content is rendered
  // by renderItem; the section title is surfaced via renderSectionHeader.
  const sections = useMemo(
    () => [
      { title: 'Profile', data: ['profile'] },
      { title: 'Events', data: ['events'] },
      { title: 'In-App Forms', data: ['forms'] },
      { title: 'Geofencing & Location', data: ['geofencing'] },
      { title: 'Push Notifications', data: ['push'] },
    ],
    []
  );

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'profile':
        return (
          <View style={styles.section}>
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
            <Collapsible title="Additional Attributes">
              <ProfileTextField
                label="First Name"
                value={analytics.firstName}
                onChangeText={analytics.setFirstName}
                onSetPress={analytics.handleSetFirstName}
                placeholder="Jane"
              />
              <ProfileTextField
                label="Last Name"
                value={analytics.lastName}
                onChangeText={analytics.setLastName}
                onSetPress={analytics.handleSetLastName}
                placeholder="Doe"
              />
              <ProfileTextField
                label="Title"
                value={analytics.title}
                onChangeText={analytics.setTitle}
                onSetPress={analytics.handleSetTitle}
                placeholder="Engineer"
              />
              <ProfileTextField
                label="Organization"
                value={analytics.organization}
                onChangeText={analytics.setOrganization}
                onSetPress={analytics.handleSetOrganization}
                placeholder="Klaviyo"
              />
            </Collapsible>
            <Collapsible title="Location">
              <ProfileTextField
                label="City"
                value={analytics.city}
                onChangeText={analytics.setCity}
                onSetPress={analytics.handleSetCity}
                placeholder="Boston"
              />
              <ProfileTextField
                label="Country"
                value={analytics.country}
                onChangeText={analytics.setCountry}
                onSetPress={analytics.handleSetCountry}
                placeholder="United States"
              />
              <ProfileTextField
                label="Zip"
                value={analytics.zip}
                onChangeText={analytics.setZip}
                onSetPress={analytics.handleSetZip}
                placeholder="02108"
              />
              <ProfileTextField
                label="Latitude"
                value={analytics.latitude}
                onChangeText={analytics.setLatitude}
                placeholder="42.3601"
                keyboardType="decimal-pad"
              />
              <ProfileTextField
                label="Longitude"
                value={analytics.longitude}
                onChangeText={analytics.setLongitude}
                placeholder="-71.0589"
                keyboardType="decimal-pad"
              />
              <ActionButton
                title="Set Location"
                onPress={analytics.handleSetLocation}
                disabled={
                  !analytics.city.trim() &&
                  !analytics.country.trim() &&
                  !analytics.zip.trim() &&
                  !analytics.latitude.trim() &&
                  !analytics.longitude.trim()
                }
              />
            </Collapsible>
            <View style={styles.actionButtonRow}>
              <ActionButton
                title="Set Profile"
                onPress={analytics.handleSetProfile}
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
        );

      case 'events':
        return (
          <View style={styles.section}>
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
        );

      case 'forms':
        return (
          <View style={styles.section}>
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
        );

      case 'geofencing':
        return (
          <View style={styles.section}>
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
            <Modal
              visible={location.geofencesModalVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={location.handleCloseGeofencesModal}
            >
              <View style={geofenceModalStyles.overlay}>
                <View style={geofenceModalStyles.container}>
                  <Text style={geofenceModalStyles.title}>
                    {`Monitored Geofences (${location.currentGeofences.length})`}
                  </Text>
                  {location.currentGeofences.length === 0 ? (
                    <Text style={geofenceModalStyles.emptyText}>
                      No geofences are currently being monitored.
                    </Text>
                  ) : (
                    <FlatList<Geofence>
                      data={location.currentGeofences}
                      keyExtractor={(item) => item.identifier}
                      renderItem={({ item, index }) => (
                        <View style={geofenceModalStyles.geofenceItem}>
                          <Text style={geofenceModalStyles.geofenceName}>
                            {`${index + 1}. ${item.identifier}`}
                          </Text>
                          <Text style={geofenceModalStyles.geofenceDetail}>
                            {`Center: (${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)})`}
                          </Text>
                          <Text style={geofenceModalStyles.geofenceDetail}>
                            {`Radius: ${item.radius.toFixed(2)}m`}
                          </Text>
                        </View>
                      )}
                    />
                  )}
                  <TouchableOpacity
                    style={geofenceModalStyles.closeButton}
                    onPress={location.handleCloseGeofencesModal}
                  >
                    <Text style={geofenceModalStyles.closeButtonText}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );

      case 'push':
        return (
          <View style={styles.section}>
            {!push.isFirebaseAvailable ? (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Firebase not configured. To enable push notifications, add
                  your Firebase config files:
                </Text>
                <Text style={styles.warningSubtext}>
                  • Android: google-services.json
                </Text>
                <Text style={styles.warningSubtext}>
                  • iOS: GoogleService-Info.plist
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.permissionStatusContainer}>
                  <Text style={styles.permissionStatusLabel}>
                    Permission Status:{' '}
                    {push.pushNotificationsEnabled ? 'Enabled' : 'Not Enabled'}
                  </Text>
                </View>
                {!push.pushNotificationsEnabled && (
                  <ActionButton
                    title="Request Push Permission"
                    onPress={push.handleRequestPushPermission}
                  />
                )}
                <View style={styles.pushTokenContainer}>
                  <Text style={styles.pushTokenLabel}>Firebase Push Token</Text>
                  <Text
                    style={[
                      styles.pushTokenText,
                      !push.pushToken && styles.pushTokenEmpty,
                    ]}
                  >
                    {push.pushToken || 'No push token available'}
                  </Text>
                </View>
                <ActionButton
                  title="Set Push Token"
                  onPress={push.handleSetPushToken}
                />
                {Platform.OS === 'ios' && (
                  <ProfileTextField
                    label="Badge Count"
                    value={push.badgeCount}
                    onChangeText={push.setBadgeCount}
                    onSetPress={push.handleSetBadgeCount}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                )}
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        sections={sections}
        keyExtractor={(item) => item}
        renderItem={({ item }) => renderSection(item)}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} />
        )}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}
