import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Klaviyo } from 'klaviyo-react-native-sdk';
import {
  requestLocationPermission,
  checkLocationPermissionState,
  type LocationPermissionState,
} from '../PermissionHelper';

export function useLocation(initialGeofencingRegistered: boolean = false) {
  const [geofencingRegistered, setGeofencingRegistered] = useState(
    initialGeofencingRegistered
  );
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>('none');

  const refreshLocationPermission = async () => {
    const state = await checkLocationPermissionState();
    setLocationPermission(state);
  };

  // Check permission state on mount
  useEffect(() => {
    refreshLocationPermission().then(() => {
      console.log('Fetched initial location permission state');
    });
  }, []);

  const handleRegisterGeofencing = () => {
    Klaviyo.registerGeofencing();
    setGeofencingRegistered(true);
    console.log('Registered for geofencing');
  };

  const handleUnregisterGeofencing = () => {
    Klaviyo.unregisterGeofencing();
    setGeofencingRegistered(false);
    console.log('Unregistered from geofencing');
  };

  const handleGetCurrentGeofences = () => {
    Klaviyo.getCurrentGeofences(
      (result: {
        geofences: Array<{
          identifier: string;
          latitude: number;
          longitude: number;
          radius: number;
        }>;
      }) => {
        const { geofences } = result;
        console.log('Current geofences:', JSON.stringify(geofences, null, 2));

        if (geofences.length === 0) {
          Alert.alert(
            'Current Geofences',
            'No geofences are currently being monitored.',
            [{ text: 'OK' }]
          );
        } else {
          const geofencesList = geofences
            .map(
              (g, index) =>
                `${index + 1}. ${g.identifier}\n   Center: (${g.latitude.toFixed(6)}, ${g.longitude.toFixed(6)})\n   Radius: ${g.radius.toFixed(2)}m`
            )
            .join('\n\n');

          Alert.alert(
            `Current Geofences (${geofences.length})`,
            geofencesList,
            [{ text: 'OK' }]
          );
        }
      }
    );
  };

  const handleRequestLocationPermission = async () => {
    await requestLocationPermission();
    await refreshLocationPermission();
  };

  return {
    geofencingRegistered,
    locationPermission,
    handleRegisterGeofencing,
    handleUnregisterGeofencing,
    handleGetCurrentGeofences,
    handleRequestLocationPermission,
  };
}
