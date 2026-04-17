import { useState, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Klaviyo, type Geofence } from 'klaviyo-react-native-sdk';
import {
  requestLocationPermission,
  checkLocationPermissionState,
  type LocationPermissionState,
} from '../PermissionHelper';
import { colors, spacing, borderRadius, typography } from '../theme';

export function useLocation() {
  // Registered state always starts false — set to true only after a successful register call.
  const [geofencingRegistered, setGeofencingRegistered] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>('none');

  // Geofence modal state — App.tsx renders the modal using these values
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

// Shared styles for the geofences modal — exported so App.tsx can use them
// when rendering the Modal component (JSX must live in .tsx files)
export const geofenceModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    // No modal-overlay token in theme.ts; inline scrim. Consider adding a
    // `colors.modalOverlay` token to theme.ts if more modals are introduced.
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.mdlg,
  },
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.mdlg,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
  },
  emptyText: {
    ...typography.label,
    color: colors.secondaryText,
    textAlign: 'center' as const,
    marginBottom: spacing.md,
    fontStyle: 'italic' as const,
  },
  geofenceItem: {
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  geofenceName: {
    ...typography.label,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  geofenceDetail: {
    fontSize: 12,
    color: colors.secondaryText,
    fontFamily: 'monospace',
  },
  closeButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.smmd,
    borderRadius: borderRadius.sm,
    alignItems: 'center' as const,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },
});
