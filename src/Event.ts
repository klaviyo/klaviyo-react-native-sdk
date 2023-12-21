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
