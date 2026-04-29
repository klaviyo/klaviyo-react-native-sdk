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

export function useForms() {
  // Registered state always starts false — set to true only after a successful register call.
  const [formsRegistered, setFormsRegistered] = useState(false);

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
    };
  }, []);

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
    handleRegisterForms,
    handleUnregisterForms,
    lifecycleEvents,
    eventsModalVisible,
    handleShowEventsModal,
    handleCloseEventsModal,
    handleClearEvents,
  };
}
