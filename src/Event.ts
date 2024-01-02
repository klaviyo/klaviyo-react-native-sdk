import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { EVENT_NAMES, EVENT_KEYS } = KlaviyoReactNativeSdk.getConstants();

// TODO: should probably come from the native module using export constants
export enum EventType {
  OPENED_PUSH = '$opened_app',
  VIEWED_PRODUCT = '$viewed_product',
  SEARCHED_PRODUCTS = '$searched_products',
  STARTED_CHECKOUT = '$started_checkout',
  PLACED_ORDER = '$placed_order',
  Ordered_Product = '$ordered_product',
  Cancelled_Order = '$cancelled_order',
  Paid_For_Order = '$paid_for_order',
  Subscribed_To_Back_In_Stock = '$subscribed_to_back_in_stock',
  Subscribed_To_Coming_Soon = '$subscribed_to_coming_soon',
  Subscribed_To_List = '$subscribed_to_list',
  Successful_Payment = '$successful_payment',
  Failed_Payment = '$failed_payment',
}

export class Identifiers {
  email?: string | null;
  phoneNumber?: string | null;
  externalId?: string | null;

  constructor(
    email: string | null = null,
    phoneNumber: string | null = null,
    externalId: string | null = null
  ) {
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.externalId = externalId;
  }
}

// Usage example:


interface Event {
  readonly name: EventType;
  readonly properties?: Record<string, Object> | null;
  readonly identifier?: Identifiers | null;
  readonly profile?: Record<string, Object> | null;
  readonly value: number | null;
  readonly time?: Date | null;
  readonly uniqueId?: string | null;
}

export class EventModel implements Event {
  readonly name: EventType;
  readonly properties?: Record<string, Object> | null;
  readonly identifier?: Identifiers | null;
  readonly profile?: Record<string, Object> | null;
  readonly value: number | null;
  readonly time?: Date | null;
  readonly uniqueId?: string | null;

  constructor(
    name: EventType,
    properties: Record<string, Object> | null = null,
    identifier: Identifiers | null = null,
    profile: Record<string, Object> | null = null,
    value: number = 0,
    time: Date | null = null,
    uniqueId: string | null = null
  ) {
    this.name = name;
    this.properties = properties;
    this.identifier = identifier;
    this.profile = profile;
    this.value = value;
    this.time = time;
    this.uniqueId = uniqueId;
  }
}

export enum EventProperty {
  EVENT_ID = EVENT_KEYS.EVENT_ID,
  VALUE = EVENT_KEYS.VALUE,
}

type KlaviyoEventPropertyType = EventProperty | string;

export interface KlaviyoEventAPI {
  readonly createEvent: (event: Event) => void;
  readonly createCustomEvent: (
    name: string,
    properties?: Record<KlaviyoEventPropertyType, Object>
  ) => void;
}
