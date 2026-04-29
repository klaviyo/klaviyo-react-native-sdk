import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BaseModal } from './BaseModal';
import { DEFAULT_COMPANY_ID } from '../hooks/useCompanyId';
import { colors, spacing, borderRadius, typography } from '../theme';

interface CompanyIdModalProps {
  visible: boolean;
  currentCompanyId: string;
  isOverridden: boolean;
  onSave: (newKey: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export const CompanyIdModal: React.FC<CompanyIdModalProps> = ({
  visible,
  currentCompanyId,
  isOverridden,
  onSave,
  onReset,
  onClose,
}) => {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft('');
    }
  }, [visible]);

  const trimmed = draft.trim();
  const canSave = trimmed.length > 0 && trimmed !== currentCompanyId;

  return (
    <BaseModal visible={visible} onClose={onClose} title="Company ID">
      <Text style={styles.label}>Active</Text>
      <Text style={styles.currentKey}>{currentCompanyId}</Text>
      {isOverridden && (
        <Text style={styles.defaultHint}>
          {`Default: ${DEFAULT_COMPANY_ID}`}
        </Text>
      )}

      <Text style={[styles.label, { marginTop: spacing.md }]}>
        Change Company ID
      </Text>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder={currentCompanyId}
        placeholderTextColor={colors.placeholderText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => canSave && onSave(trimmed)}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
          ]}
          onPress={() => canSave && onSave(trimmed)}
          disabled={!canSave}
        >
          <Text
            style={[
              styles.saveButtonText,
              !canSave && styles.saveButtonTextDisabled,
            ]}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {isOverridden && (
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={onReset}
        >
          <Text style={styles.resetButtonText}>Reset to Default</Text>
        </TouchableOpacity>
      )}
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  currentKey: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'monospace',
    backgroundColor: colors.disabledBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.smmd,
    overflow: 'hidden' as const,
  },
  defaultHint: {
    ...typography.label,
    color: colors.secondaryText,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.smmd,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.cardBackground,
    minHeight: 44,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.smmd,
    borderRadius: borderRadius.sm,
    alignItems: 'center' as const,
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  cancelButton: {
    backgroundColor: colors.disabledBackground,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },
  saveButtonTextDisabled: {
    color: colors.buttonText,
  },
  resetButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: colors.cardBackground,
  },
  resetButtonText: {
    ...typography.button,
    color: colors.destructive,
  },
});
