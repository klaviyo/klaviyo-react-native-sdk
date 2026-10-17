import { View } from 'react-native';

import { useLogging } from '../hooks/useLogging';
import { styles } from '../Styles';
import { ToggleButtons } from '../components/ToggleButtons';

export function LoggingSection() {
  const logging = useLogging();

  return (
    <View style={styles.section}>
      <ToggleButtons
        leftLabel="Enable Logging"
        rightLabel="Disable Logging"
        isLeftActive={logging.loggingEnabled}
        onLeftPress={() => logging.handleSetLoggingEnabled(true)}
        onRightPress={() => logging.handleSetLoggingEnabled(false)}
        leftDisabled={logging.loggingEnabled}
        rightDisabled={!logging.loggingEnabled}
      />
    </View>
  );
}
