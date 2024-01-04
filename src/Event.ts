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

const { EVENT_NAMES } = KlaviyoReactNativeSdk.getConstants();

/* Event interface types */
export enum MetricName {
  OPENED_PUSH = EVENT_NAMES.OPENED_PUSH,
  VIEWED_PRODUCT = EVENT_NAMES.VIEWED_PRODUCT,
  STARTED_CHECKOUT = EVENT_NAMES.STARTED_CHECKOUT,
  OPENED_APP = EVENT_NAMES.OPENED_APP,
  ADDED_TO_CART = EVENT_NAMES.ADDED_TO_CART,
}

/* various event properties that can be set on an event */
export interface Identifiers {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
}

export interface Events {
  readonly name?: MetricName;
  readonly properties?: Record<string, Object>;
  readonly identifier?: Identifiers;
  readonly profile?: Record<ProfileProperty, Object>;
  readonly value?: number;
  readonly time?: string;
  readonly uniqueId?: string;
}
