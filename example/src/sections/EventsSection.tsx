import { memo } from 'react';
import { View } from 'react-native';

import type { useAnalytics } from '../hooks/useAnalytics';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';

type Props = {
  analytics: ReturnType<typeof useAnalytics>;
};

function EventsSectionImpl({ analytics }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.actionButtonRow}>
        <ActionButton
          title="Test Event"
          onPress={analytics.handleCreateTestEvent}
          inRow
        />
        <ActionButton
          title="Viewed Product"
          onPress={analytics.handleViewedProduct}
          inRow
        />
      </View>
    </View>
  );
}

export const EventsSection = memo(EventsSectionImpl);
