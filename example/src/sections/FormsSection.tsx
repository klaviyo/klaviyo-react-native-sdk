import { View } from 'react-native';

import { useForms } from '../hooks/useForms';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { FormLifecycleEventsModal } from '../components/FormLifecycleEventsModal';
import { ToggleButtons } from '../components/ToggleButtons';

export function FormsSection() {
  const forms = useForms();

  return (
    <View style={styles.section}>
      <ToggleButtons
        leftLabel="Register"
        rightLabel="Unregister"
        leftTestID="forms_register_button"
        rightTestID="forms_unregister_button"
        leftAccessibilityLabel="Register for in-app forms"
        rightAccessibilityLabel="Unregister from in-app forms"
        isLeftActive={forms.formsRegistered}
        onLeftPress={forms.handleRegisterForms}
        onRightPress={forms.handleUnregisterForms}
        leftDisabled={forms.formsRegistered}
        rightDisabled={!forms.formsRegistered}
      />
      <ActionButton
        title={`Show Lifecycle Events (${forms.lifecycleEvents.length})`}
        testID="forms_show_lifecycle_events_button"
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
