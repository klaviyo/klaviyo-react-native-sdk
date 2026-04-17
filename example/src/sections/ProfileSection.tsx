import { memo } from 'react';
import { View } from 'react-native';

import type { useAnalytics } from '../hooks/useAnalytics';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { Collapsible } from '../components/Collapsible';
import { ProfileTextField } from '../components/ProfileTextField';

type Props = {
  analytics: ReturnType<typeof useAnalytics>;
};

function ProfileSectionImpl({ analytics }: Props) {
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
}

export const ProfileSection = memo(ProfileSectionImpl);
