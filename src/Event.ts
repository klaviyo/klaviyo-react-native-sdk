import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { EVENT_NAMES, EVENT_KEYS } = KlaviyoReactNativeSdk.getConstants();

export enum EventType {
  OPENED_APP = EVENT_NAMES.VIEWED_PRODUCT,
  VIEWED_PRODUCT = EVENT_NAMES.VIEWED_PRODUCT,
  ADDED_TO_CART = EVENT_NAMES.VIEWED_PRODUCT,
  STARTED_CHECKOUT = EVENT_NAMES.VIEWED_PRODUCT,
}

export enum EventProperty {
  EVENT_ID = EVENT_KEYS.EVENT_ID,
  VALUE = EVENT_KEYS.VALUE,
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
