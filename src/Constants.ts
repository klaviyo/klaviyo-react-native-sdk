import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { PROFILE_KEYS, EVENT_NAMES, EVENT_KEYS } =
  KlaviyoReactNativeSdk.getConstants();

export const {
  ADDRESS1,
  ADDRESS2,
  CITY,
  COUNTRY,
  EMAIL,
  EXTERNAL_ID,
  FIRST_NAME,
  IMAGE,
  LAST_NAME,
  LATITUDE,
  LONGITUDE,
  ORGANIZATION,
  PHONE_NUMBER,
  REGION,
  TIMEZONE,
  TITLE,
  ZIP,
} = PROFILE_KEYS;

export const { OPENED_PUSH, VIEWED_PRODUCT, ADDED_TO_CART } = EVENT_NAMES;

export const { EVENT_ID, PUSH_TOKEN, VALUE } = EVENT_KEYS;
