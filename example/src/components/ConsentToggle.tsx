import React from 'react';
import { Switch, Text, View } from 'react-native';

import { styles } from '../Styles';
import { colors } from '../theme';

interface ConsentToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * A labelled switch for one independently-selectable consent sub-type.
 *
 * ToggleButtons is deliberately not reused here: it models a mutually exclusive
 * either/or choice, whereas consent sub-types can each be granted on their own.
 */
export const ConsentToggle: React.FC<ConsentToggleProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
}) => (
  <View style={styles.consentToggleRow}>
    <Text
      style={[
        styles.consentToggleLabel,
        disabled && styles.consentToggleLabelDisabled,
      ]}
    >
      {label}
    </Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.border, true: colors.primary }}
      accessibilityLabel={label}
    />
  </View>
);
