import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styles } from '../Styles';

interface ToggleButtonsProps {
  leftLabel: string;
  rightLabel: string;
  isLeftActive: boolean;
  onLeftPress: () => void;
  onRightPress: () => void;
}

/**
 * Toggle button pair (e.g., Register/Unregister) with active state indication
 */
export const ToggleButtons: React.FC<ToggleButtonsProps> = ({
  leftLabel,
  rightLabel,
  isLeftActive,
  onLeftPress,
  onRightPress,
}) => {
  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, isLeftActive && styles.toggleButtonActive]}
        onPress={onLeftPress}
      >
        <Text
          style={[
            styles.toggleButtonText,
            isLeftActive && styles.toggleButtonTextActive,
          ]}
        >
          {leftLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          !isLeftActive && styles.toggleButtonActive,
        ]}
        onPress={onRightPress}
      >
        <Text
          style={[
            styles.toggleButtonText,
            !isLeftActive && styles.toggleButtonTextActive,
          ]}
        >
          {rightLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
