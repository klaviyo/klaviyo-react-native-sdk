

export enum EventKey {
  OPENED_PUSH = "\$opened_push"
}


export type EventType = EventKey | string

export enum EventPropertyKey {
  EVENT_ID = "\$event_id"
}

export type EventProperty = EventPropertyKey | string


export type EventProperties = {
  [key in EventProperty]: any
}

export interface IEvent {
  readonly event: EventType
  readonly properties?: EventProperties
}

export interface IKlaviyo {
  readonly createEvent: (event: IEvent) => void;
}
