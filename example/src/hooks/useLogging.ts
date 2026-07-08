import { useState, useEffect, useCallback } from 'react';
import { Klaviyo } from 'klaviyo-react-native-sdk';

export function useLogging() {
  // SDK logging is enabled by default; read the actual state from the SDK on
  // mount so the UI reflects the native source of truth.
  const [loggingEnabled, setLoggingEnabled] = useState(true);

  useEffect(() => {
    Klaviyo.isLoggingEnabled(setLoggingEnabled);
  }, []);

  const handleSetLoggingEnabled = useCallback((enabled: boolean) => {
    Klaviyo.setLoggingEnabled(enabled);
    console.log(`[useLogging] SDK logging → ${enabled}`);
    // Read back from the SDK rather than trusting the local value.
    Klaviyo.isLoggingEnabled(setLoggingEnabled);
  }, []);

  return {
    loggingEnabled,
    handleSetLoggingEnabled,
  };
}
