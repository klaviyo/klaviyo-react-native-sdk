import { View } from 'react-native';

import { useAnalytics } from '../hooks/useAnalytics';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { Collapsible } from '../components/Collapsible';
import { ProfileTextField } from '../components/ProfileTextField';
import { SectionHeader } from '../components/SectionHeader';

// Profile fields and events both live behind the same `useAnalytics` hook so
// they share state (e.g. an email typed in Profile is the same profile that
// events attribute to). Keeping them in a single section — and therefore a
// single hook instance — is simpler than plumbing context or a wrapper just
// for a demo app. We render an inner SectionHeader to visually separate the
// "Events" buttons from the profile fields above.
export function AnalyticsSection() {
  const analytics = useAnalytics();

  return (
    <View style={styles.section}>
      <ProfileTextField
        label="External ID"
        testID="profile_external_id"
        value={analytics.externalId}
        onChangeText={analytics.setExternalId}
        onSetPress={analytics.handleSetExternalId}
        placeholder="Enter external ID"
      />
      <ProfileTextField
        label="Email Address"
        testID="profile_email"
        value={analytics.email}
        onChangeText={analytics.setEmail}
        onSetPress={analytics.handleSetEmail}
        placeholder="user@example.com"
        keyboardType="email-address"
      />
      <ProfileTextField
        label="Phone Number"
        testID="profile_phone_number"
        value={analytics.phoneNumber}
        onChangeText={analytics.setPhoneNumber}
        onSetPress={analytics.handleSetPhoneNumber}
        placeholder="+1234567890"
        keyboardType="phone-pad"
      />
      <Collapsible
        title="Additional Attributes"
        testID="profile_additional_attributes_toggle"
      >
        <ProfileTextField
          label="First Name"
          testID="profile_first_name"
          value={analytics.firstName}
          onChangeText={analytics.setFirstName}
          onSetPress={analytics.handleSetFirstName}
          placeholder="Jane"
        />
        <ProfileTextField
          label="Last Name"
          testID="profile_last_name"
          value={analytics.lastName}
          onChangeText={analytics.setLastName}
          onSetPress={analytics.handleSetLastName}
          placeholder="Doe"
        />
        <ProfileTextField
          label="Title"
          testID="profile_title"
          value={analytics.title}
          onChangeText={analytics.setTitle}
          onSetPress={analytics.handleSetTitle}
          placeholder="Engineer"
        />
        <ProfileTextField
          label="Organization"
          testID="profile_organization"
          value={analytics.organization}
          onChangeText={analytics.setOrganization}
          onSetPress={analytics.handleSetOrganization}
          placeholder="Klaviyo"
        />
      </Collapsible>
      <Collapsible title="Location" testID="profile_location_toggle">
        <ProfileTextField
          label="City"
          testID="profile_city"
          value={analytics.city}
          onChangeText={analytics.setCity}
          onSetPress={analytics.handleSetCity}
          placeholder="Boston"
        />
        <ProfileTextField
          label="Country"
          testID="profile_country"
          value={analytics.country}
          onChangeText={analytics.setCountry}
          onSetPress={analytics.handleSetCountry}
          placeholder="United States"
        />
        <ProfileTextField
          label="Zip"
          testID="profile_zip"
          value={analytics.zip}
          onChangeText={analytics.setZip}
          onSetPress={analytics.handleSetZip}
          placeholder="02108"
        />
        <ProfileTextField
          label="Latitude"
          testID="profile_latitude"
          value={analytics.latitude}
          onChangeText={analytics.setLatitude}
          placeholder="42.3601"
          keyboardType="decimal-pad"
        />
        <ProfileTextField
          label="Longitude"
          testID="profile_longitude"
          value={analytics.longitude}
          onChangeText={analytics.setLongitude}
          placeholder="-71.0589"
          keyboardType="decimal-pad"
        />
        <ActionButton
          title="Set Location"
          testID="profile_set_location_button"
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
          testID="profile_set_profile_button"
          onPress={analytics.handleSetProfile}
          inRow
        />
        <ActionButton
          title="Reset Profile"
          testID="profile_reset_button"
          onPress={analytics.handleResetProfile}
          destructive
          inRow
        />
      </View>
      <SectionHeader title="Events" />
      <View style={styles.actionButtonRow}>
        <ActionButton
          title="Test Event"
          testID="events_test_event_button"
          accessibilityLabel="Create test event"
          onPress={analytics.handleCreateTestEvent}
          inRow
        />
        <ActionButton
          title="Viewed Product"
          testID="events_viewed_product_button"
          accessibilityLabel="Create viewed product event"
          onPress={analytics.handleViewedProduct}
          inRow
        />
      </View>
    </View>
  );
}
