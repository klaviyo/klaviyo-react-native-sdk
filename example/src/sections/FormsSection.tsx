import { Text, TextInput, View } from 'react-native';

import { useForms } from '../hooks/useForms';
import { styles } from '../Styles';
import { colors } from '../theme';
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
        isLeftActive={forms.formsRegistered}
        onLeftPress={forms.handleRegisterForms}
        onRightPress={forms.handleUnregisterForms}
        leftDisabled={forms.formsRegistered || forms.formsFailed}
        rightDisabled={!forms.formsRegistered && !forms.formsFailed}
      />
      {forms.formsRegistered && <Text>Registration requested</Text>}
      {forms.formsFailed && (
        <>
          <Text>Forms initialization failed</Text>
          <ActionButton
            title={`Retry (${forms.retriesRemaining} remaining)`}
            onPress={forms.handleRetryForms}
            disabled={forms.retriesRemaining === 0}
            withTopSpacing
          />
        </>
      )}
      <View style={styles.profileFieldContainer}>
        <Text style={styles.profileFieldLabel}>Form ID</Text>
        <View style={styles.profileFieldRow}>
          <TextInput
            style={styles.profileFieldInput}
            accessibilityLabel="Form ID"
            placeholder="Enter a form ID"
            placeholderTextColor={colors.placeholderText}
            value={forms.formId}
            onChangeText={forms.setFormId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      <ActionButton
        title="Open Form"
        onPress={forms.handleOpenForm}
        disabled={!forms.formId.trim()}
      />
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
