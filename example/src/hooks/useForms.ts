import { useState } from 'react';
import { Klaviyo } from 'klaviyo-react-native-sdk';

// sessionTimeoutDuration defaults to 3600s — omitting here uses the production default.
// Set to 30 for rapid testing: { sessionTimeoutDuration: 30 }

export function useForms() {
  // Registered state always starts false — set to true only after a successful register call.
  const [formsRegistered, setFormsRegistered] = useState(false);

  const handleRegisterForms = () => {
    Klaviyo.registerForInAppForms();
    setFormsRegistered(true);
    console.log('[useForms] registered → true');
  };

  const handleUnregisterForms = () => {
    Klaviyo.unregisterFromInAppForms();
    setFormsRegistered(false);
    console.log('[useForms] registered → false');
  };

  return {
    formsRegistered,
    handleRegisterForms,
    handleUnregisterForms,
  };
}
