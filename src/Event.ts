import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { EVENT_NAMES } = KlaviyoReactNativeSdk.getConstants();

export enum MetricName {
  OPENED_PUSH = EVENT_NAMES.OPENED_PUSH,
  VIEWED_PRODUCT = EVENT_NAMES.VIEWED_PRODUCT,
  STARTED_CHECKOUT = EVENT_NAMES.STARTED_CHECKOUT,
  OPENED_APP = EVENT_NAMES.OPENED_APP,
  ADDED_TO_CART = EVENT_NAMES.ADDED_TO_CART,
}

export interface Event {
  readonly name: MetricName | string;
  readonly value?: number;
  readonly uniqueId?: string;
  readonly properties?: Record<string, Object>;
}

export interface KlaviyoEventAPI {
  readonly createEvent: (event: Event) => void;
}
