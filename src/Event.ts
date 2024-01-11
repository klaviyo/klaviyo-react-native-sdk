import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { EVENT_NAMES } = KlaviyoReactNativeSdk.getConstants();

export enum EventName {
  VIEWED_PRODUCT_METRIC = EVENT_NAMES.VIEWED_PRODUCT_METRIC,
  STARTED_CHECKOUT_METRIC = EVENT_NAMES.STARTED_CHECKOUT_METRIC,
  OPENED_APP_METRIC = EVENT_NAMES.OPENED_APP_METRIC,
  ADDED_TO_CART_METRIC = EVENT_NAMES.ADDED_TO_CART_METRIC,
}

export interface Event {
  readonly name: EventName | string;
  readonly value?: number;
  readonly uniqueId?: string;
  readonly properties?: Record<string, Object>;
}

export interface KlaviyoEventAPI {
  readonly createEvent: (event: Event) => void;
}
