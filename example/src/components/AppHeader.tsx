import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface AppHeaderProps {
  onSettingsPress: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onSettingsPress }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Klaviyo SDK Example</Text>
      <TouchableOpacity
        onPress={onSettingsPress}
        style={styles.settingsButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Open settings"
        accessibilityRole="button"
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
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
  settingsButton: {
    padding: spacing.xs,
  },
  settingsIcon: {
    fontSize: 22,
    color: colors.secondaryText,
  },
});
