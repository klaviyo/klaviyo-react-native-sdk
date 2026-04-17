import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../Styles';

interface SectionHeaderProps {
  title: string;
}

/**
 * Section header with title and bottom border. The border is on the
 * wrapping View because iOS silently drops individual border-side
 * properties (borderBottomWidth, etc.) on Text components.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
};
