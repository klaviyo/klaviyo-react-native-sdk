export enum EventType {
  OPENED_PUSH = '$opened_push',
}

export enum EventProperty {
  EVENT_ID = '$event_id',
  VALUE = 'value',
}

type KlaviyoEventPropertyType = EventProperty | string;

export interface KlaviyoEventAPI {
  readonly createEvent: (
    name: EventType,
    properties?: Record<KlaviyoEventPropertyType, Object>
  ) => void;
  readonly createCustomEvent: (
    name: string,
    properties?: Record<KlaviyoEventPropertyType, Object>
  ) => void;
}
