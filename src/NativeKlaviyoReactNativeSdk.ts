import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export class EventType {
  public name: string;

  private constructor(name: string) {
    this.name = name;
  }

  public static OPENED_PUSH: EventType = new EventType('$opened_push');
  public static CUSTOM = (name: string): EventType => new EventType(name);
}

export class EventProperty {
  public name: string;

  private constructor(name: string) {
    this.name = name;
  }

  public static EVENT_ID: EventProperty = new EventProperty('$event_id');
  public static CUSTOM = (name: string): EventProperty =>
    new EventProperty(name);
}

export interface IEvent {
  event: EventType;
  properties?: Object;
}

export interface Spec extends TurboModule {
  createEvent(event: IEvent): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('KlaviyoReactNativeSdk');
