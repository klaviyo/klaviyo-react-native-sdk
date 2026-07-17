import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import type { RootStackParamList } from '../navigation/types';

/**
 * "Auth" section on the Home screen (MAGE-879). Unlike the other sections,
 * there's no inline UI here — the auth-token provider scripting/observation
 * lives on a dedicated pushed screen (`AuthScreen`), so this section is just
 * an entry point.
 */
export function AuthSection() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.section}>
      <ActionButton
        title="Configure auth token provider"
        onPress={() => navigation.navigate('AuthScreen')}
      />
    </View>
  );
}
