import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from '../Styles';

interface ActionButtonProps {
  title: string;
  /** Stable ID for UI tests and automation, e.g. `push_request_permission_button`. */
  testID: string;
  /** Overrides the spoken label when `title` alone is ambiguous out of context. */
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  inRow?: boolean;
  withTopSpacing?: boolean;
}

/**
 * Styled action button with optional destructive styling
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  testID,
  accessibilityLabel,
  onPress,
  disabled = false,
  destructive = false,
  inRow = false,
  withTopSpacing = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        inRow && styles.actionButtonInRow,
        destructive && styles.actionButtonDestructive,
        disabled && styles.actionButtonDisabled,
        withTopSpacing && styles.actionButtonWithTopSpacing,
      ]}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
    >
      <Text
        style={[
          styles.actionButtonText,
          destructive && styles.actionButtonTextDestructive,
          disabled && styles.actionButtonTextDisabled,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
