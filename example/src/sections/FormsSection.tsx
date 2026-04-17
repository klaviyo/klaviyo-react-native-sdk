import { View } from 'react-native';

import { useForms } from '../hooks/useForms';
import { styles } from '../Styles';
import { ToggleButtons } from '../components/ToggleButtons';

export function FormsSection() {
  const forms = useForms();

  return (
    <View style={styles.section}>
      <ToggleButtons
        leftLabel="Register"
        rightLabel="Unregister"
        isLeftActive={forms.formsRegistered}
        onLeftPress={forms.handleRegisterForms}
        onRightPress={forms.handleUnregisterForms}
        leftDisabled={forms.formsRegistered}
        rightDisabled={!forms.formsRegistered}
      />
    </View>
  );
}
