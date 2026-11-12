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
        leftTestID="logging_enable_button"
        rightTestID="logging_disable_button"
        isLeftActive={logging.loggingEnabled}
        onLeftPress={() => logging.handleSetLoggingEnabled(true)}
        onRightPress={() => logging.handleSetLoggingEnabled(false)}
        leftDisabled={logging.loggingEnabled}
        rightDisabled={!logging.loggingEnabled}
      />
    </View>
  );
}
