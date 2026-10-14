import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BaseModal } from './BaseModal';
import { colors, spacing, borderRadius, typography } from '../theme';

export interface SdkInfoEntry {
  label: string;
  version?: string;
  ref?: string;
  isCurrentPlatform?: boolean;
}

interface SdkInfoModalProps {
  visible: boolean;
  entries: SdkInfoEntry[];
  onClose: () => void;
}

export const SdkInfoModal: React.FC<SdkInfoModalProps> = ({
  visible,
  entries,
  onClose,
}) => {
  return (
    <BaseModal visible={visible} onClose={onClose} title="SDK Versions">
      {entries.map((entry) => (
        <View key={entry.label} style={styles.row}>
          <Text style={styles.label}>
            {entry.label}
            {entry.isCurrentPlatform ? ' (this device)' : ''}
          </Text>
          <Text style={styles.value}>
            {entry.version ?? 'unknown'}
            {entry.ref ? ` @ ${entry.ref}` : ''}
          </Text>
        </View>
      ))}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'monospace',
    backgroundColor: colors.disabledBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.smmd,
    overflow: 'hidden' as const,
  },
  closeButton: {
    paddingVertical: spacing.smmd,
    borderRadius: borderRadius.sm,
    alignItems: 'center' as const,
    minHeight: 44,
    justifyContent: 'center' as const,
    backgroundColor: colors.primary,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },
});
