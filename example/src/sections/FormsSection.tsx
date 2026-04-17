import { memo } from 'react';
import { View } from 'react-native';

import type { useForms } from '../hooks/useForms';
import { styles } from '../Styles';
import { ToggleButtons } from '../components/ToggleButtons';

type Props = {
  forms: ReturnType<typeof useForms>;
};

function FormsSectionImpl({ forms }: Props) {
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

export const FormsSection = memo(FormsSectionImpl);
