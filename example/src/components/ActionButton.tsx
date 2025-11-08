import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from '../Styles';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

/**
 * Styled action button with optional destructive styling
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  disabled = false,
  destructive = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        destructive && styles.actionButtonDestructive,
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.actionButtonText,
          destructive && styles.actionButtonTextDestructive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
