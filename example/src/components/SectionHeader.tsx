import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../Styles';

interface SectionHeaderProps {
  title: string;
  /** Icon (e.g. an emoji glyph) for an optional right-aligned header action, such as "clear". Omit for a plain title-only header. */
  actionIcon?: string;
  actionAccessibilityLabel?: string;
  actionDisabled?: boolean;
  onActionPress?: () => void;
}

/**
 * Section header with title and bottom border, plus an optional
 * right-aligned icon action (e.g. the Auth screen's log-clear button). The
 * border is on the wrapping View because iOS silently drops individual
 * border-side properties (borderBottomWidth, etc.) on Text components.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionIcon,
  actionAccessibilityLabel,
  actionDisabled = false,
  onActionPress,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      {onActionPress && actionIcon && (
        <TouchableOpacity
          onPress={onActionPress}
          disabled={actionDisabled}
          accessibilityLabel={actionAccessibilityLabel}
          hitSlop={8}
        >
          <Text
            style={[
              styles.sectionHeaderActionIcon,
              actionDisabled && styles.sectionHeaderActionIconDisabled,
            ]}
          >
            {actionIcon}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
