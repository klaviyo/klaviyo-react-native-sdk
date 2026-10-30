import { Text, View } from 'react-native';

import { useLocation } from '../hooks/useLocation';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { GeofencesModal } from '../components/GeofencesModal';
import { ToggleButtons } from '../components/ToggleButtons';

export function GeofencingSection() {
  const location = useLocation();

  return (
    <View style={styles.section}>
      {location.locationPermission === 'none' && (
        <ActionButton
          title="Request Location Permission"
          testID="location_request_permission_button"
          onPress={location.handleRequestLocationPermission}
        />
      )}
      {location.locationPermission === 'inUse' && (
        <ActionButton
          title="Request Background Permission"
          testID="location_request_background_permission_button"
          onPress={location.handleRequestLocationPermission}
        />
      )}
      {location.locationPermission === 'background' && (
        <View
          style={styles.permissionGrantedContainer}
          testID="location_permission_granted_text"
        >
          <Text style={styles.permissionGrantedText}>
            Background Permission Granted
          </Text>
        </View>
      )}
      <ToggleButtons
        leftLabel="Register"
        rightLabel="Unregister"
        leftTestID="geofencing_register_button"
        rightTestID="geofencing_unregister_button"
        leftAccessibilityLabel="Register for geofencing"
        rightAccessibilityLabel="Unregister from geofencing"
        isLeftActive={location.geofencingRegistered}
        onLeftPress={location.handleRegisterGeofencing}
        onRightPress={location.handleUnregisterGeofencing}
        leftDisabled={location.geofencingRegistered}
        rightDisabled={!location.geofencingRegistered}
      />
      {location.geofencingRegistered && (
        <ActionButton
          title="Get Current Geofences"
          testID="geofencing_get_current_geofences_button"
          onPress={location.handleGetCurrentGeofences}
          withTopSpacing
        />
      )}
      <GeofencesModal
        visible={location.geofencesModalVisible}
        geofences={location.currentGeofences}
        onClose={location.handleCloseGeofencesModal}
      />
    </View>
  );
}
