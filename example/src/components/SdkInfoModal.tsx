import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { BaseModal } from './BaseModal';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { SdkInfoEntry } from '../sdkInfo';

export type { SdkInfoEntry };

interface SdkInfoModalProps {
  visible: boolean;
  entries: SdkInfoEntry[];
  // Text the copy button hands to the share sheet.
  copyText: string;
  onClose: () => void;
}

// Share.share needs no native dependency; swap this one function for a
// clipboard module if plain copy is ever preferred.
const shareBuildInfo = (text: string) => {
  Share.share({ message: text }).catch(() => {});
};

export const SdkInfoModal: React.FC<SdkInfoModalProps> = ({
  visible,
  entries,
  copyText,
  onClose,
}) => {
  return (
    <BaseModal visible={visible} onClose={onClose} title="Build info">
      {entries.map((entry) => (
        <View key={entry.label} style={styles.row}>
          <Text style={styles.label}>{entry.label}</Text>
          <Text style={styles.value}>{entry.version ?? '—'}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={styles.copyButton}
        onPress={() => shareBuildInfo(copyText)}
      >
        <Text style={styles.copyButtonText}>Copy build info</Text>
      </TouchableOpacity>
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
  copyButton: {
    paddingVertical: spacing.smmd,
    borderRadius: borderRadius.sm,
    alignItems: 'center' as const,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.smmd,
  },
  copyButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },
  closeButton: {
    paddingVertical: spacing.smmd,
    borderRadius: borderRadius.sm,
    alignItems: 'center' as const,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },
});
