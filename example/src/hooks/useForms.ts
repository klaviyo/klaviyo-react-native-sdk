import { useState, useEffect, useCallback, useRef } from 'react';
import { Klaviyo, type FormLifecycleEvent } from 'klaviyo-react-native-sdk';

// A received event plus a monotonic id and wall-clock time, used by the
// FormLifecycleEventsModal to render a chronological log. The id is assigned
// at insertion so FlatList keys stay stable across prepends.
export type FormLifecycleLogEntry = {
  id: number;
  receivedAt: number;
  event: FormLifecycleEvent;
};

// Ring-buffer cap — new entries push oldest out once we hit this many.
const MAX_LIFECYCLE_EVENTS = 100;
const MAX_FORM_RETRIES = 2;

export function useForms() {
  const [formsRegistered, setFormsRegistered] = useState(false);
  const [formsFailed, setFormsFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Lifecycle event log — newest first, capped at MAX_LIFECYCLE_EVENTS.
  const [lifecycleEvents, setLifecycleEvents] = useState<
    FormLifecycleLogEntry[]
  >([]);
  const [eventsModalVisible, setEventsModalVisible] = useState(false);
  const nextEventIdRef = useRef(0);

  // Subscribe to form lifecycle events for the lifetime of the hook. The SDK
  // only emits events while forms are registered, so subscribing unconditionally
  // is safe — the handler is idle until `registerForInAppForms` is called.
  // registerFormLifecycleHandler returns an unsubscribe function.
  useEffect(() => {
    console.log('[useForms] subscribing to form lifecycle events');
    const unsubscribe = Klaviyo.registerFormLifecycleHandler((event) => {
      console.log('[useForms] lifecycle event:', event);
      const id = ++nextEventIdRef.current;
      setLifecycleEvents((prev) =>
        [{ id, receivedAt: Date.now(), event }, ...prev].slice(
          0,
          MAX_LIFECYCLE_EVENTS
        )
      );
    });
    return () => {
      console.log('[useForms] unsubscribing from form lifecycle events');
      unsubscribe();
      Klaviyo.unregisterFromInAppForms();
    };
  }, []);

  const requestFormsRegistration = () => {
    setFormsRegistered(true);
    setFormsFailed(false);
    Klaviyo.registerForInAppForms({
      sessionTimeoutDuration: 3600,
      loadTimeout: 15,
      eventReplayWindow: 10,
      onFailure: () => {
        console.log(
          '[useForms] forms initialization failed; use Retry to try again'
        );
        setFormsRegistered(false);
        setFormsFailed(true);
      },
    });
    console.log('[useForms] registration requested; readiness is not reported');
  };

  const handleRegisterForms = () => {
    setRetryCount(0);
    requestFormsRegistration();
  };

  const handleRetryForms = () => {
    if (!formsFailed || retryCount >= MAX_FORM_RETRIES) return;
    setRetryCount(retryCount + 1);
    requestFormsRegistration();
  };

  const handleUnregisterForms = () => {
    Klaviyo.unregisterFromInAppForms();
    setFormsRegistered(false);
    setFormsFailed(false);
    setRetryCount(0);
    console.log('[useForms] registered → false');
  };

  const handleShowEventsModal = useCallback(() => {
    setEventsModalVisible(true);
  }, []);

  const handleCloseEventsModal = useCallback(() => {
    setEventsModalVisible(false);
  }, []);

  const handleClearEvents = useCallback(() => {
    setLifecycleEvents([]);
  }, []);

  return {
    formsRegistered,
    formsFailed,
    retriesRemaining: MAX_FORM_RETRIES - retryCount,
    handleRetryForms,
    handleRegisterForms,
    handleUnregisterForms,
    lifecycleEvents,
    eventsModalVisible,
    handleShowEventsModal,
    handleCloseEventsModal,
    handleClearEvents,
  };
}
