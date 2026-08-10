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
        // The row is a single line of text, so extend the touch target to ~44pt
        // via hitSlop rather than minHeight: it reaches into the container's
        // padding, which is dead space anyway, without making the collapsed
        // warning taller — the point of collapsing it was to take up less room.
        hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }}
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
