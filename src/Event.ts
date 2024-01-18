import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { EVENT_NAMES } = KlaviyoReactNativeSdk.getConstants();

/**
 * EventName is a convenience enum for the names of common events that can be tracked.
 */
export enum EventName {
  /**
   * The 'Added to Cart' event is used to track when a user adds a product to their cart.
   */
  ADDED_TO_CART_METRIC = EVENT_NAMES.ADDED_TO_CART,
  /**
   * The 'Opened App' event is used to track when a user opens the app.
   */
  OPENED_APP_METRIC = EVENT_NAMES.OPENED_APP,
  /**
   * The 'Started Checkout' event is used to track when a user starts the checkout process.
   */
  STARTED_CHECKOUT_METRIC = EVENT_NAMES.STARTED_CHECKOUT,
  /**
   * The 'Viewed Product' event is used to track when a user views a product.
   */
  VIEWED_PRODUCT_METRIC = EVENT_NAMES.VIEWED_PRODUCT,
}

export type EventProperties = Record<string, Object>;

export interface Event {
  /**
   * Name of the event. Must be less than 128 characters.
   */
  readonly name: EventName | string;
  /**
   * A numeric value to associate with this event. For example, the dollar amount of a purchase.
   */
  readonly value?: number;
  /**
   * A unique identifier for an event. If the uniqueId is repeated for the same
   * profile and metric, only the first processed event will be recorded. If this is not
   * present, this will use the time to the second. Using the default, this limits only one
   * event per profile per second.
   */
  readonly uniqueId?: string;
  /**
   * Properties of this event. Any top level property (that are not objects) can be
   * used to create segments. The $extra property is a special property. This records any
   * non-segmentable values that can be referenced later. For example, HTML templates are
   * useful on a segment but are not used to create a segment. There are limits
   * placed onto the size of the data present. This must not exceed 5 MB. This must not
   * exceed 300 event properties. A single string cannot be larger than 100 KB. Each array
   * must not exceed 4000 elements. The properties cannot contain more than 10 nested levels.
   */
  readonly properties?: EventProperties;
}

export interface KlaviyoEventAPI {
  /**
   * Create a new event to track a profile's activity.
   * @param event - The event to track
   */
  createEvent(event: Event): void;
}
