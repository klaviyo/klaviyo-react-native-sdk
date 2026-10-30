import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styles } from '../Styles';

interface ToggleButtonsProps {
  leftLabel: string;
  rightLabel: string;
  /** Stable IDs for UI tests and automation, e.g. `forms_register_button`. */
  leftTestID: string;
  rightTestID: string;
  /** Override the spoken labels when `leftLabel`/`rightLabel` are ambiguous out of context. */
  leftAccessibilityLabel?: string;
  rightAccessibilityLabel?: string;
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
  leftTestID,
  rightTestID,
  leftAccessibilityLabel,
  rightAccessibilityLabel,
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
          !leftDisabled && isLeftActive && styles.toggleButtonActive,
          leftDisabled && styles.toggleButtonDisabled,
        ]}
        onPress={onLeftPress}
        disabled={leftDisabled}
        testID={leftTestID}
        accessibilityRole="button"
        accessibilityLabel={leftAccessibilityLabel ?? leftLabel}
        accessibilityState={{ disabled: leftDisabled, selected: isLeftActive }}
      >
        <Text
          style={[
            styles.toggleButtonText,
            leftDisabled && styles.toggleButtonTextDisabled,
          ]}
        >
          {leftLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          !rightDisabled && !isLeftActive && styles.toggleButtonActive,
          rightDisabled && styles.toggleButtonDisabled,
        ]}
        onPress={onRightPress}
        disabled={rightDisabled}
        testID={rightTestID}
        accessibilityRole="button"
        accessibilityLabel={rightAccessibilityLabel ?? rightLabel}
        accessibilityState={{
          disabled: rightDisabled,
          selected: !isLeftActive,
        }}
      >
        <Text
          style={[
            styles.toggleButtonText,
            rightDisabled && styles.toggleButtonTextDisabled,
          ]}
        >
          {rightLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
