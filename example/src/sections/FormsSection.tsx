import { View } from 'react-native';

import { useForms } from '../hooks/useForms';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { ConsentToggle } from '../components/ConsentToggle';
import { ProfileTextField } from '../components/ProfileTextField';
import { FormLifecycleEventsModal } from '../components/FormLifecycleEventsModal';
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
      <ConsentToggle
        label="Forms preview"
        value={forms.formsPreviewEnabled}
        onValueChange={forms.handleFormsPreviewEnabledChange}
      />
      {forms.formsPreviewEnabled && (
        <ProfileTextField
          label="Forms preview token"
          value={forms.formsPreviewToken}
          onChangeText={forms.setFormsPreviewToken}
          onSetPress={forms.handleApplyFormsPreviewToken}
          placeholder="Paste a token from Preview on device"
        />
      )}
      <ActionButton
        title={`Show Lifecycle Events (${forms.lifecycleEvents.length})`}
        onPress={forms.handleShowEventsModal}
        withTopSpacing
      />
      <FormLifecycleEventsModal
        visible={forms.eventsModalVisible}
        events={forms.lifecycleEvents}
        onClose={forms.handleCloseEventsModal}
        onClear={forms.handleClearEvents}
      />
    </View>
  );
}
