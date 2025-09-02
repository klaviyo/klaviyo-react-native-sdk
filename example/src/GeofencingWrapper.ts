import { Alert } from 'react-native';
import Geofencing, {
  GeofenceTransitionType,
  type GeofenceEvent,
} from '../../src/Geofencing';

/**
 * Initialize geofencing with default configuration
 */
export const initializeGeofencing = async (): Promise<void> => {
  try {
    await Geofencing.initialize();
    Alert.alert('Success', 'Geofencing initialized successfully!');
  } catch (error) {
    Alert.alert('Error', `Failed to initialize geofencing: ${error}`);
  }
};

/**
 * Add default placeholder geofences for testing
 */
export const addDefaultGeofences = async (): Promise<void> => {
  try {
    await Geofencing.addDefaultGeofences();
    Alert.alert('Success', 'Default geofences added successfully!');
  } catch (error) {
    Alert.alert('Error', `Failed to add default geofences: ${error}`);
  }
};

/**
 * Start geofencing monitoring
 */
export const startGeofencing = async (): Promise<void> => {
  try {
    await Geofencing.start();
    Alert.alert('Success', 'Geofencing monitoring started!');
  } catch (error) {
    Alert.alert('Error', `Failed to start geofencing: ${error}`);
  }
};

/**
 * Stop geofencing monitoring
 */
export const stopGeofencing = async (): Promise<void> => {
  try {
    await Geofencing.stop();
    Alert.alert('Success', 'Geofencing monitoring stopped!');
  } catch (error) {
    Alert.alert('Error', `Failed to stop geofencing: ${error}`);
  }
};

/**
 * Remove all geofences
 */
export const removeAllGeofences = async (): Promise<void> => {
  try {
    await Geofencing.removeAllGeofences();
    Alert.alert('Success', 'All geofences removed!');
  } catch (error) {
    Alert.alert('Error', `Failed to remove geofences: ${error}`);
  }
};

/**
 * Get current geofences
 */
export const getCurrentGeofences = async (): Promise<void> => {
  try {
    const geofences = Geofencing.getGeofences();
    const geofenceList = geofences
      .map((g) => `${g.id}: (${g.latitude}, ${g.longitude}) - ${g.radius}m`)
      .join('\n');
    Alert.alert('Current Geofences', geofenceList || 'No geofences configured');
  } catch (error) {
    Alert.alert('Error', `Failed to get geofences: ${error}`);
  }
};

/**
 * Check if geofencing is initialized
 */
export const checkGeofencingStatus = async (): Promise<void> => {
  const isInitialized = Geofencing.isGeofencingInitialized();
  // const permissionStatus = await Geofencing.checkLocationPermissionStatus();
  Alert.alert(
    'Geofencing Status',
    `Initialized: ${isInitialized ? 'Yes' : 'No'}`
  );
};

/**
 * Simulate geofence enter event for testing
 */
export const simulateGeofenceEnter = async (): Promise<void> => {
  try {
    Geofencing.simulateGeofenceEvent('home', GeofenceTransitionType.ENTER);
    Alert.alert('Success', 'Simulated geofence enter event for "home"');
  } catch (error) {
    Alert.alert('Error', `Failed to simulate geofence event: ${error}`);
  }
};

/**
 * Simulate geofence exit event for testing
 */
export const simulateGeofenceExit = async (): Promise<void> => {
  try {
    Geofencing.simulateGeofenceEvent('home', GeofenceTransitionType.EXIT);
    Alert.alert('Success', 'Simulated geofence exit event for "home"');
  } catch (error) {
    Alert.alert('Error', `Failed to simulate geofence event: ${error}`);
  }
};

/**
 * Setup geofence event listeners
 */
export const setupGeofenceListeners = async (): Promise<void> => {
  // Set up enter event listener
  Geofencing.onGeofenceEnter((event: GeofenceEvent) => {
    console.log('Geofence Enter Event:', event);
    Alert.alert(
      'Geofence Entered',
      `You entered: ${event.geofenceId}\nLocation: ${event.location.latitude}, ${event.location.longitude}`
    );
  });

  // Set up exit event listener
  Geofencing.onGeofenceExit((event: GeofenceEvent) => {
    console.log('Geofence Exit Event:', event);
    Alert.alert(
      'Geofence Exited',
      `You exited: ${event.geofenceId}\nLocation: ${event.location.latitude}, ${event.location.longitude}`
    );
  });

  Alert.alert('Success', 'Geofence event listeners set up!');
};

/**
 * Add a custom geofence
 */
export const addCustomGeofence = async (): Promise<void> => {
  try {
    const customGeofence = {
      id: 'custom_location',
      latitude: 40.7128, // New York coordinates as placeholder
      longitude: -74.006,
      radius: 150,
      transitionType: GeofenceTransitionType.ENTER_AND_EXIT,
      notification: {
        title: 'Custom Location',
        text: "You've entered/exited the custom area",
      },
    };

    await Geofencing.addGeofence(customGeofence);
    Alert.alert('Success', 'Custom geofence added successfully!');
  } catch (error) {
    Alert.alert('Error', `Failed to add custom geofence: ${error}`);
  }
};

/**
 * Check location permission status
 */
export const checkLocationPermission = async (): Promise<void> => {
  try {
    Alert.alert('Location Permission Status');
  } catch (error) {
    Alert.alert('Error', `Failed to check permission status: ${error}`);
  }
};
