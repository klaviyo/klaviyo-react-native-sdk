import { useState, useEffect, useCallback } from 'react';
import { Klaviyo, type Geofence } from 'klaviyo-react-native-sdk';
import {
  requestLocationPermission,
  checkLocationPermissionState,
  type LocationPermissionState,
} from '../PermissionHelper';

export function useLocation() {
  // Registered state always starts false — set to true only after a successful register call.
  const [geofencingRegistered, setGeofencingRegistered] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>('none');

  // Geofence modal state — consumed by GeofencesModal rendered from App.tsx
  const [geofencesModalVisible, setGeofencesModalVisible] = useState(false);
  const [currentGeofences, setCurrentGeofences] = useState<Geofence[]>([]);

  const refreshLocationPermission = useCallback(async () => {
    const state = await checkLocationPermissionState();
    setLocationPermission(state);
  }, []);

  // Check permission state on mount
  useEffect(() => {
    console.log('[useLocation] mounted');
    refreshLocationPermission();
  }, [refreshLocationPermission]);

  // Registration is only triggered by explicit user action, never on mount
  const handleRegisterGeofencing = () => {
    Klaviyo.registerGeofencing();
    setGeofencingRegistered(true);
    console.log('[useLocation] registered → true');
  };

  const handleUnregisterGeofencing = () => {
    Klaviyo.unregisterGeofencing();
    setGeofencingRegistered(false);
    console.log('[useLocation] registered → false');
  };

  const handleGetCurrentGeofences = () => {
    Klaviyo.getCurrentGeofences((result: { geofences: Geofence[] }) => {
      const { geofences } = result;
      console.log('[useLocation] geofences fetched:', geofences.length);
      setCurrentGeofences(geofences);
      setGeofencesModalVisible(true);
    });
  };

  const handleRequestLocationPermission = async () => {
    await requestLocationPermission();
    await refreshLocationPermission();
  };

  const handleCloseGeofencesModal = () => setGeofencesModalVisible(false);

  return {
    geofencingRegistered,
    locationPermission,
    handleRegisterGeofencing,
    handleUnregisterGeofencing,
    handleGetCurrentGeofences,
    handleRequestLocationPermission,
    geofencesModalVisible,
    currentGeofences,
    handleCloseGeofencesModal,
  };
}
