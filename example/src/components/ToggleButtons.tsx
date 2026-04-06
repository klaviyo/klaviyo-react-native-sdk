import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styles } from '../Styles';

interface ToggleButtonsProps {
  leftLabel: string;
  rightLabel: string;
  isLeftActive: boolean;
  onLeftPress: () => void;
  onRightPress: () => void;
  leftDisabled?: boolean;
  rightDisabled?: boolean;
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
  leftDisabled = false,
  rightDisabled = false,
}) => {
  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          isLeftActive && styles.toggleButtonActive,
          leftDisabled && styles.toggleButtonDisabled,
        ]}
        onPress={onLeftPress}
        disabled={leftDisabled}
      >
        <Text
          style={[
            styles.toggleButtonText,
            isLeftActive && styles.toggleButtonTextActive,
            leftDisabled && styles.toggleButtonTextDisabled,
          ]}
        >
          {leftLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          !isLeftActive && styles.toggleButtonActive,
          rightDisabled && styles.toggleButtonDisabled,
        ]}
        onPress={onRightPress}
        disabled={rightDisabled}
      >
        <Text
          style={[
            styles.toggleButtonText,
            !isLeftActive && styles.toggleButtonTextActive,
            rightDisabled && styles.toggleButtonTextDisabled,
          ]}
        >
          {rightLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
