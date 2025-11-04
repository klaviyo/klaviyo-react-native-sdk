export interface KlaviyoGeofencingApi {
  registerGeofencing(): void;
  monitorGeofencesFromBackground(): void;
  unregisterGeofencing(): void;
}
