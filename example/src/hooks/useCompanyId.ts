import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Klaviyo } from 'klaviyo-react-native-sdk';
import { KLAVIYO_API_KEY } from '@env';

const STORAGE_KEY = 'klaviyo_company_id_override';

// The build-time default sourced from example/.env — same value used by the
// module-scope Klaviyo.initialize() call in App.tsx.
export const DEFAULT_COMPANY_ID: string = KLAVIYO_API_KEY ?? '';

export function useCompanyId() {
  const [companyId, setCompanyId] = useState(DEFAULT_COMPANY_ID);

  useEffect(() => {
    // Apply a persisted override if one exists. The module-scope initialize()
    // in App.tsx already ran with the .env default; this re-inits only when
    // the user has previously saved a different key.
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored !== DEFAULT_COMPANY_ID) {
        Klaviyo.resetProfile();
        Klaviyo.initialize(stored);
        setCompanyId(stored);
      }
    });
  }, []);

  const changeCompanyId = async (newKey: string) => {
    await AsyncStorage.setItem(STORAGE_KEY, newKey);
    Klaviyo.resetProfile();
    Klaviyo.initialize(newKey);
    setCompanyId(newKey);
  };

  const resetToDefault = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    Klaviyo.resetProfile();
    Klaviyo.initialize(DEFAULT_COMPANY_ID);
    setCompanyId(DEFAULT_COMPANY_ID);
  };

  return {
    companyId,
    isOverridden: companyId !== DEFAULT_COMPANY_ID,
    changeCompanyId,
    resetToDefault,
  };
}
