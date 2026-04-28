import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { type Geofence } from 'klaviyo-react-native-sdk';
import { BaseModal } from './BaseModal';
import { colors, spacing, borderRadius, typography } from '../theme';

interface GeofencesModalProps {
  visible: boolean;
  geofences: Geofence[];
  onClose: () => void;
}

export const GeofencesModal: React.FC<GeofencesModalProps> = ({
  visible,
  geofences,
  onClose,
}) => {
  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title={`Monitored Geofences (${geofences.length})`}
      maxHeight="80%"
    >
      {geofences.length === 0 ? (
        <Text style={styles.emptyText}>
          No geofences are currently being monitored.
        </Text>
      ) : (
        <FlatList<Geofence>
          data={geofences}
          keyExtractor={(item) => item.identifier}
          renderItem={({ item, index }) => (
            <View style={styles.geofenceItem}>
              <Text style={styles.geofenceName}>
                {`${index + 1}. ${item.identifier}`}
              </Text>
              <Text style={styles.geofenceDetail}>
                {`Center: (${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)})`}
              </Text>
              <Text style={styles.geofenceDetail}>
                {`Radius: ${item.radius.toFixed(2)}m`}
              </Text>
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  emptyText: {
    ...typography.label,
    color: colors.secondaryText,
    textAlign: 'center' as const,
    marginBottom: spacing.md,
    fontStyle: 'italic' as const,
  },
  geofenceItem: {
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  geofenceName: {
    ...typography.label,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  geofenceDetail: {
    fontSize: 12,
    color: colors.secondaryText,
    fontFamily: 'monospace',
  },
  closeButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.smmd,
    borderRadius: borderRadius.sm,
    alignItems: 'center' as const,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },
});
