import { useState } from 'react';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export function useForms() {
  // Registered state always starts false — set to true only after a successful register call.
  const [formsRegistered, setFormsRegistered] = useState(false);

  const handleRegisterForms = () => {
    // Passed explicitly here to demonstrate the FormConfiguration shape;
    // 3600s matches the SDK default, so this call is behaviorally equivalent
    // to calling registerForInAppForms() with no argument. Lower values
    // (e.g. 30) are useful for rapid testing.
    Klaviyo.registerForInAppForms({ sessionTimeoutDuration: 3600 });
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
