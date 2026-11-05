import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { styles } from '../Styles';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleProps {
  title: string;
  /** Stable ID for the expand/collapse header, e.g. `profile_location_toggle`. */
  testID: string;
  initiallyExpanded?: boolean;
  children: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  testID,
  initiallyExpanded = false,
  children,
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.collapsibleContainer}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={toggle}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Text style={styles.collapsibleChevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
};
