import React from 'react';
import { Text } from 'react-native';
import { styles } from '../Styles';

interface SectionHeaderProps {
  title: string;
}

/**
 * Section header with title and bottom border
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return <Text style={styles.sectionHeader}>{title}</Text>;
};
