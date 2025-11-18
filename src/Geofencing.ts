export interface Geofence {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface KlaviyoGeofencingApi {
  registerGeofencing(): void;
  unregisterGeofencing(): void;
  getCurrentGeofences(
    callback: (result: { geofences: Geofence[] }) => void
  ): void;
}
