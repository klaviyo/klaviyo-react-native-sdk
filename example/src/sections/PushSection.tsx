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
        <View
          style={styles.warningContainer}
          testID="push_firebase_not_configured_warning"
        >
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
            <Text
              style={styles.permissionStatusLabel}
              testID="push_permission_status_text"
            >
              Permission Status:{' '}
              {push.pushNotificationsEnabled ? 'Enabled' : 'Not Enabled'}
            </Text>
          </View>
          {!push.pushNotificationsEnabled && (
            <ActionButton
              title="Request Push Permission"
              testID="push_request_permission_button"
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
              testID="push_token_text"
            >
              {push.pushToken || 'No push token available'}
            </Text>
          </View>
          <ActionButton
            title="Set Push Token"
            testID="push_set_token_button"
            onPress={push.handleSetPushToken}
          />
          {Platform.OS === 'ios' && push.pushNotificationsEnabled && (
            <ProfileTextField
              label="Badge Count"
              testID="push_badge_count"
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
