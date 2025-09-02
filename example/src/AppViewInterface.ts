import {
  initialize,
  getEmail,
  getExternalId,
  getPhoneNumber,
  resetProfile,
  setPushToken,
  sendRandomEvent,
  setEmail,
  setExternalId,
  setPhoneNumber,
  setProfileAttribute,
  setProfile,
  setBadgeCount,
  getPushToken,
  registerForInAppForms,
  unregisterFromInAppForms,
} from './KlaviyoReactWrapper';
import {
  initializeGeofencing,
  addDefaultGeofences,
  startGeofencing,
  stopGeofencing,
  removeAllGeofences,
  getCurrentGeofences,
  checkGeofencingStatus,
  simulateGeofenceEnter,
  simulateGeofenceExit,
  setupGeofenceListeners,
  addCustomGeofence,
  checkLocationPermission,
} from './GeofencingWrapper';

export interface AppViewInterface {
  title: string;
  color: string;
  onPress: () => Promise<void>;
}

export const appViews: AppViewInterface[] = [
  {
    title: 'Click to initialize',
    color: '#841584',
    onPress: initialize,
  },
  {
    title: 'Click to set the full profile',
    color: '#841584',
    onPress: setProfile,
  },
  {
    title: 'Click to set some profile attributes',
    color: '#841584',
    onPress: setProfileAttribute,
  },
  {
    title: 'Click to set the email',
    color: '#841584',
    onPress: setEmail,
  },
  {
    title: 'Click to set the phone number',
    color: '#841584',
    onPress: setPhoneNumber,
  },
  {
    title: 'Click to set external id',
    color: '#841584',
    onPress: setExternalId,
  },
  {
    title: 'Click to set a FAKE push token',
    color: '#841584',
    onPress: setPushToken,
  },
  {
    title: 'Click to set badge count',
    color: '#841584',
    onPress: setBadgeCount,
  },
  {
    title: 'Click to get current email',
    color: '#65935e',
    onPress: getEmail,
  },
  {
    title: 'Click to get phone number',
    color: '#65935e',
    onPress: getPhoneNumber,
  },
  {
    title: 'Click to get external id',
    color: '#65935e',
    onPress: getExternalId,
  },
  {
    title: 'Click to get push token',
    color: '#65935e',
    onPress: getPushToken,
  },
  {
    title: 'Click to send event with random metric',
    color: '#0009b9',
    onPress: sendRandomEvent,
  },
  {
    title: 'Click to RESET the full profile',
    color: '#932322',
    onPress: resetProfile,
  },
  {
    title: 'Register for in-app forms',
    color: '#d3ab10',
    onPress: registerForInAppForms,
  },
  {
    title: 'Unregister from in-app forms',
    color: '#d3ab10',
    onPress: unregisterFromInAppForms,
  },
  // Geofencing functionality
  {
    title: 'Initialize Geofencing',
    color: '#4CAF50',
    onPress: initializeGeofencing,
  },
  {
    title: 'Add Default Geofences',
    color: '#4CAF50',
    onPress: addDefaultGeofences,
  },
  {
    title: 'Start Geofencing',
    color: '#4CAF50',
    onPress: startGeofencing,
  },
  {
    title: 'Stop Geofencing',
    color: '#FF5722',
    onPress: stopGeofencing,
  },
  {
    title: 'Setup Geofence Listeners',
    color: '#2196F3',
    onPress: setupGeofenceListeners,
  },
  {
    title: 'Get Current Geofences',
    color: '#2196F3',
    onPress: getCurrentGeofences,
  },
  {
    title: 'Check Geofencing Status',
    color: '#2196F3',
    onPress: checkGeofencingStatus,
  },
  {
    title: 'Check Location Permission',
    color: '#2196F3',
    onPress: checkLocationPermission,
  },
  {
    title: 'Add Custom Geofence',
    color: '#9C27B0',
    onPress: addCustomGeofence,
  },
  {
    title: 'Simulate Geofence Enter',
    color: '#FF9800',
    onPress: simulateGeofenceEnter,
  },
  {
    title: 'Simulate Geofence Exit',
    color: '#FF9800',
    onPress: simulateGeofenceExit,
  },
  {
    title: 'Remove All Geofences',
    color: '#F44336',
    onPress: removeAllGeofences,
  },
];
