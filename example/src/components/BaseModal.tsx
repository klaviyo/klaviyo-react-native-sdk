import React from 'react';
import { Modal, View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  // Cap on container height — pass when content can grow (lists). Omit for
  // content-sized modals.
  maxHeight?: ViewStyle['maxHeight'];
}

/**
 * Shared modal shell: dimmed overlay, centered card container, centered title.
 * `statusBarTranslucent` ensures the scrim covers the Android notch area —
 * without it, the system status bar leaves an unscrim'd band at the top.
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  title,
  children,
  maxHeight,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.container, maxHeight !== undefined && { maxHeight }]}
        >
          <Text style={styles.title}>{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.mdlg,
  },
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.mdlg,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
  },
});
