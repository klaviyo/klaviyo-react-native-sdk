import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../Styles';

interface ProfileTextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSetPress: () => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

/**
 * Profile text field with label, input, and inline "Set" button
 */
export const ProfileTextField: React.FC<ProfileTextFieldProps> = ({
  label,
  value,
  onChangeText,
  onSetPress,
  placeholder,
  keyboardType = 'default',
}) => {
  const isEmpty = !value.trim();

  return (
    <View style={styles.profileFieldContainer}>
      <Text style={styles.profileFieldLabel}>{label}</Text>
      <View style={styles.profileFieldRow}>
        <TextInput
          style={styles.profileFieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.profileFieldButton,
            isEmpty && styles.profileFieldButtonDisabled,
          ]}
          onPress={onSetPress}
          disabled={isEmpty}
        >
          <Text style={styles.profileFieldButtonText}>Set</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
