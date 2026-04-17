import { memo } from 'react';
import { Text, View } from 'react-native';

import type { useLocation } from '../hooks/useLocation';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { GeofencesModal } from '../components/GeofencesModal';
import { ToggleButtons } from '../components/ToggleButtons';

type Props = {
  location: ReturnType<typeof useLocation>;
};

function GeofencingSectionImpl({ location }: Props) {
  return (
    <View style={styles.section}>
      {location.locationPermission === 'none' && (
        <ActionButton
          title="Request Location Permission"
          onPress={location.handleRequestLocationPermission}
        />
      )}
      {location.locationPermission === 'inUse' && (
        <ActionButton
          title="Request Background Permission"
          onPress={location.handleRequestLocationPermission}
        />
      )}
      {location.locationPermission === 'background' && (
        <View style={styles.permissionGrantedContainer}>
          <Text style={styles.permissionGrantedText}>
            Background Permission Granted
          </Text>
        </View>
      )}
      <ToggleButtons
        leftLabel="Register"
        rightLabel="Unregister"
        isLeftActive={location.geofencingRegistered}
        onLeftPress={location.handleRegisterGeofencing}
        onRightPress={location.handleUnregisterGeofencing}
        leftDisabled={location.geofencingRegistered}
        rightDisabled={!location.geofencingRegistered}
      />
      {location.geofencingRegistered && (
        <ActionButton
          title="Get Current Geofences"
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

export const GeofencingSection = memo(GeofencingSectionImpl);
