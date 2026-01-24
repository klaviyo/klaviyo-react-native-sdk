import { useState } from 'react';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export function useForms(initialRegistered: boolean = false) {
  const [formsRegistered, setFormsRegistered] = useState(initialRegistered);

  const handleRegisterForms = () => {
    Klaviyo.registerForInAppForms();
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
