import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface AppHeaderProps {
  onSettingsPress: () => void;
  onInfoPress: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onSettingsPress,
  onInfoPress,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Klaviyo SDK Example</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onInfoPress}
          style={styles.settingsButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="sdk_info_button"
          accessibilityLabel="SDK version info"
          accessibilityRole="button"
        >
          <Text style={styles.settingsIcon}>ⓘ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSettingsPress}
          style={styles.settingsButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="settings_button"
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smmd,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.sectionHeader,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsButton: {
    padding: spacing.xs,
  },
  settingsIcon: {
    fontSize: 22,
    color: colors.secondaryText,
  },
});
