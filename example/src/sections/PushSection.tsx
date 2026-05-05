import { Platform, Text, View } from 'react-native';

import { usePush } from '../hooks/usePush';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { ProfileTextField } from '../components/ProfileTextField';

export function PushSection() {
  const push = usePush();

  return (
    <View style={styles.section}>
      {!push.isFirebaseAvailable ? (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Firebase not configured. To enable push notifications, add your
            Firebase config files:
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
            <Text style={styles.pushTokenLabel}>
              {Platform.OS === 'ios'
                ? 'APNs Push Token'
                : 'Firebase Push Token'}
            </Text>
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
          {Platform.OS === 'ios' && push.pushNotificationsEnabled && (
            <ProfileTextField
              label="Badge Count"
              value={push.badgeCount}
              onChangeText={push.setBadgeCount}
              onSetPress={push.handleSetBadgeCount}
              placeholder="0"
              keyboardType="number-pad"
            />
          )}
        </>
      )}
    </View>
  );
}
