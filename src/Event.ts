import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';
import type { ProfileProperty } from './Profile';

/*API interfaces for event related operations*/
export interface KlaviyoEventAPI {
  readonly createEvent: (event: Events) => void;
  //TODO: TBD
  // readonly createCustomEvent: (
  //   name: string,
  //   properties?: Record<KlaviyoEventPropertyType, Object>
  // ) => void;
}

const { EVENT_NAMES, EVENT_KEYS } = KlaviyoReactNativeSdk.getConstants();

/* Event interface types */
export enum EventName {
  OPENED_PUSH = EVENT_NAMES.OPENED_PUSH,
  VIEWED_PRODUCT = EVENT_NAMES.VIEWED_PRODUCT,
  SEARCHED_PRODUCTS = EVENT_NAMES.SEARCHED_PRODUCTS,
  STARTED_CHECKOUT = EVENT_NAMES.STARTED_CHECKOUT,
  PLACED_ORDER = EVENT_NAMES.PLACED_ORDER,
  ORDERED_PRODUCT = EVENT_NAMES.ORDERED_PRODUCT,
  CANCELLED_ORDER = EVENT_NAMES.CANCELLED_ORDER,
  PAID_FOR_ORDER = EVENT_NAMES.PAID_FOR_ORDER,
  SUBSCRIBED_TO_BACK_IN_STOCK = EVENT_NAMES.SUBSCRIBED_TO_BACK_IN_STOCK,
  SUBSCRIBED_TO_COMING_SOON = EVENT_NAMES.SUBSCRIBED_TO_COMING_SOON,
  SUBSCRIBED_TO_LIST = EVENT_NAMES.SUBSCRIBED_TO_LIST,
  SUCCESSFUL_PAYMENT = EVENT_NAMES.SUCCESSFUL_PAYMENT,
  FAILED_PAYMENT = EVENT_NAMES.FAILED_PAYMENT,
}

/* various event properties that can be set on an event */
export interface Identifiers {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
}

export interface Events {
  readonly name?: EventName;
  readonly properties?: Record<KlaviyoEventPropertyType, Object>;
  readonly identifier?: Identifiers;
  readonly profile?: Record<ProfileProperty, Object>;
  readonly value?: number;
  readonly time?: Date;
  readonly uniqueId?: string;
}

export enum EventProperty {
  EVENT_ID = EVENT_KEYS.EVENT_ID,
  VALUE = EVENT_KEYS.VALUE,
}

export type KlaviyoEventPropertyType = EventProperty | string;
