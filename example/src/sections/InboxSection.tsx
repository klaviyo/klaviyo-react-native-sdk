import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { InboxTestIDs } from '../inbox/testIDs';
import type { RootStackParamList } from '../navigation/types';

/**
 * Entry point for the Inbox validation screen. The screen does the work; this
 * section only pushes it, so the Inbox's state is created fresh each time it is
 * opened and the background change subscription is torn down on the way back.
 */
export function InboxSection() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.section}>
      <ActionButton
        title="Open Inbox validation"
        testID={InboxTestIDs.HOME_ENTRY_BUTTON}
        onPress={() => navigation.navigate('InboxScreen')}
      />
    </View>
  );
}
