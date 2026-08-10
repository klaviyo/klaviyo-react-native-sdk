import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { styles } from '../Styles';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleWarningProps {
  title: string;
  initiallyExpanded?: boolean;
  children: React.ReactNode;
}

/**
 * A warning callout whose detail hides behind a chevron, collapsed by default.
 *
 * Keeps a one-off caveat from dominating a section: the headline stays visible,
 * the explanation is one tap away. Uses the same chevron and easeInEaseOut
 * animation as {@link Collapsible} so the affordance is familiar, but keeps the
 * warning palette rather than the neutral field-group styling.
 *
 * Carries its own bottom spacing, since a warning of this shape always sits
 * above other content.
 */
export const CollapsibleWarning: React.FC<CollapsibleWarningProps> = ({
  title,
  initiallyExpanded = false,
  children,
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View
      style={[
        styles.warningContainer,
        styles.warningContainerWithBottomSpacing,
      ]}
    >
      <TouchableOpacity
        style={styles.warningHeaderRow}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Hides the details' : 'Shows the details'}
      >
        <Text style={styles.warningHeaderText}>{title}</Text>
        <Text style={styles.warningChevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.warningCollapsibleContent}>{children}</View>
      )}
    </View>
  );
};
