import { NativeModules } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const { KlaviyoReactNativeSdk } = NativeModules;

export interface GeofenceConfig {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  transitionType: GeofenceTransitionType;
  notification?: {
    title: string;
    text: string;
  };
}

export enum GeofenceTransitionType {
  ENTER = 1,
  EXIT = 2,
  ENTER_AND_EXIT = 3,
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface GeofenceEvent {
  geofenceId: string;
  transitionType: GeofenceTransitionType;
  location: LocationData;
  timestamp: number;
}

class Geofencing {
  private isInitialized: boolean = false;
  private geofences: Map<string, GeofenceConfig> = new Map();
  private onGeofenceEnterCallback?: (event: GeofenceEvent) => void;
  private onGeofenceExitCallback?: (event: GeofenceEvent) => void;

  /**
   * Initialize geofencing with default configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Geofencing already initialized');
      return;
    }

    try {
      // Request location permissions
      await this.requestLocationPermissions();

      // Configure with placeholder values as per the guide
      const config = {
        desiredAccuracy: 10, // HIGH_ACCURACY equivalent
        stationaryRadius: 50,
        distanceFilter: 50,
        notificationTitle: 'Klaviyo Geofencing',
        notificationText: 'Location tracking active',
        debug: false,
        startOnBoot: true,
        stopOnTerminate: false,
        interval: 10000,
        fastestInterval: 5000,
        activitiesInterval: 10000,
        stopOnStillActivity: false,
      };

      // Initialize native module if available
      if (KlaviyoReactNativeSdk && KlaviyoReactNativeSdk.configureGeofencing) {
        await KlaviyoReactNativeSdk.configureGeofencing(config);
      }

      this.isInitialized = true;
      console.log('Geofencing initialized successfully');
    } catch (error) {
      console.error('Failed to initialize geofencing:', error);
      throw error;
    }
  }

  /**
   * Request location permissions for Android and iOS
   */
  private async requestLocationPermissions() {
    const granted = await Geolocation.requestAuthorization('whenInUse');

    return granted === 'granted';
  }

  /**
   * Add a geofence with placeholder values
   */
  async addGeofence(geofence: GeofenceConfig): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Geofencing not initialized. Call initialize() first.');
    }

    // Store geofence configuration
    this.geofences.set(geofence.id, geofence);

    // Add to native module if available
    if (KlaviyoReactNativeSdk && KlaviyoReactNativeSdk.addGeofence) {
      await KlaviyoReactNativeSdk.addGeofence(geofence);
    }

    console.log(`Geofence added: ${geofence.id}`);
  }

  /**
   * Add default placeholder geofences for testing
   */
  async addDefaultGeofences(): Promise<void> {
    const defaultGeofences: GeofenceConfig[] = [
      {
        id: 'home',
        latitude: 37.4219983,
        longitude: -122.084,
        radius: 100,
        transitionType: GeofenceTransitionType.ENTER_AND_EXIT,
        notification: {
          title: 'Home Geofence',
          text: "You've entered/exited your home area",
        },
      },
      {
        id: 'office',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 200,
        transitionType: GeofenceTransitionType.ENTER,
        notification: {
          title: 'Office Geofence',
          text: 'Welcome to the office!',
        },
      },
      {
        id: 'coffee_shop',
        latitude: 37.7858,
        longitude: -122.4064,
        radius: 50,
        transitionType: GeofenceTransitionType.EXIT,
        notification: {
          title: 'Coffee Shop',
          text: 'Thanks for visiting!',
        },
      },
    ];

    for (const geofence of defaultGeofences) {
      await this.addGeofence(geofence);
    }
  }

  /**
   * Remove a geofence
   */
  async removeGeofence(geofenceId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Geofencing not initialized. Call initialize() first.');
    }

    this.geofences.delete(geofenceId);

    if (KlaviyoReactNativeSdk && KlaviyoReactNativeSdk.removeGeofence) {
      await KlaviyoReactNativeSdk.removeGeofence(geofenceId);
    }

    console.log(`Geofence removed: ${geofenceId}`);
  }

  /**
   * Remove all geofences
   */
  async removeAllGeofences(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Geofencing not initialized. Call initialize() first.');
    }

    this.geofences.clear();

    if (KlaviyoReactNativeSdk && KlaviyoReactNativeSdk.removeAllGeofences) {
      await KlaviyoReactNativeSdk.removeAllGeofences();
    }

    console.log('All geofences removed');
  }

  /**
   * Start geofencing monitoring
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Geofencing not initialized. Call initialize() first.');
    }

    if (KlaviyoReactNativeSdk && KlaviyoReactNativeSdk.startGeofencing) {
      await KlaviyoReactNativeSdk.startGeofencing();
    }

    console.log('Geofencing started');
  }

  /**
   * Stop geofencing monitoring
   */
  async stop(): Promise<void> {
    if (KlaviyoReactNativeSdk && KlaviyoReactNativeSdk.stopGeofencing) {
      await KlaviyoReactNativeSdk.stopGeofencing();
    }

    console.log('Geofencing stopped');
  }

  /**
   * Set callback for geofence enter events
   */
  onGeofenceEnter(callback: (event: GeofenceEvent) => void): void {
    this.onGeofenceEnterCallback = callback;
  }

  /**
   * Set callback for geofence exit events
   */
  onGeofenceExit(callback: (event: GeofenceEvent) => void): void {
    this.onGeofenceExitCallback = callback;
  }

  /**
   * Get current geofences
   */
  getGeofences(): GeofenceConfig[] {
    return Array.from(this.geofences.values());
  }

  /**
   * Check if geofencing is initialized
   */
  isGeofencingInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Simulate geofence event for testing (placeholder implementation)
   */
  simulateGeofenceEvent(
    geofenceId: string,
    transitionType: GeofenceTransitionType
  ): void {
    const geofence = this.geofences.get(geofenceId);
    if (!geofence) {
      console.warn(`Geofence ${geofenceId} not found`);
      return;
    }

    const event: GeofenceEvent = {
      geofenceId,
      transitionType,
      location: {
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        accuracy: 10,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    if (
      transitionType === GeofenceTransitionType.ENTER &&
      this.onGeofenceEnterCallback
    ) {
      this.onGeofenceEnterCallback(event);
    } else if (
      transitionType === GeofenceTransitionType.EXIT &&
      this.onGeofenceExitCallback
    ) {
      this.onGeofenceExitCallback(event);
    }

    console.log(
      `Simulated geofence event: ${geofenceId} - ${transitionType === GeofenceTransitionType.ENTER ? 'ENTER' : 'EXIT'}`
    );
  }
}

export default new Geofencing();
