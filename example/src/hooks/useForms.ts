import { useState } from 'react';
import { Klaviyo } from 'klaviyo-react-native-sdk';

// Session timeout duration in seconds for in-app forms.
// After this period of user inactivity, the forms session ends.
// Default is 1 hour (3600s); we use 30s here to make it easier to test session behavior.
const FORMS_SESSION_TIMEOUT_SECONDS = 30;

export function useForms(initialRegistered: boolean = false) {
  const [formsRegistered, setFormsRegistered] = useState(initialRegistered);

  const handleRegisterForms = () => {
    Klaviyo.registerForInAppForms({
      sessionTimeoutDuration: FORMS_SESSION_TIMEOUT_SECONDS,
    });
    setFormsRegistered(true);
    console.log('Registered for in-app forms');
  };

  const handleUnregisterForms = () => {
    Klaviyo.unregisterFromInAppForms();
    setFormsRegistered(false);
    console.log('Unregistered from in-app forms');
  };

  return {
    formsRegistered,
    handleRegisterForms,
    handleUnregisterForms,
  };
}
