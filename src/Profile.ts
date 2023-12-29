import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { PROFILE_KEYS } = KlaviyoReactNativeSdk.getConstants();

export enum ProfileProperty {
  EXTERNAL_ID = PROFILE_KEYS.EXTERNAL_ID,
  EMAIL = PROFILE_KEYS.EMAIL,
  PHONE_NUMBER = PROFILE_KEYS.PHONE_NUMBER,
  FIRST_NAME = PROFILE_KEYS.FIRST_NAME,
  LAST_NAME = PROFILE_KEYS.LAST_NAME,
  TITLE = PROFILE_KEYS.TITLE,
  ORGANIZATION = PROFILE_KEYS.ORGANIZATION,
  IMAGE = PROFILE_KEYS.IMAGE,
  ADDRESS1 = PROFILE_KEYS.ADDRESS1,
  ADDRESS2 = PROFILE_KEYS.ADDRESS2,
  CITY = PROFILE_KEYS.CITY,
  COUNTRY = PROFILE_KEYS.COUNTRY,
  ZIP = PROFILE_KEYS.ZIP,
  REGION = PROFILE_KEYS.REGION,
  LATITUDE = PROFILE_KEYS.LATITUDE,
  LONGITUDE = PROFILE_KEYS.LONGITUDE,
  TIMEZONE = PROFILE_KEYS.TIMEZONE,
}

export type KlaviyoProfilePropertyType = ProfileProperty | string;
export type ProfileProperties = Record<KlaviyoProfilePropertyType, Object>;

export class Profile {
  public externalId?: String;
  public email?: String;
  public phoneNumber?: String;
  public properties?: ProfileProperties;
}

export interface KlaviyoProfileApi {
  readonly setProfile: (profile: ProfileProperties) => void;

  readonly setEmail: (email: String) => void;
  readonly setExternalId: (externalId: String) => void;
  readonly setPhoneNumber: (phoneNumber: String) => void;
  readonly setProfileAttribute: (
    propertyKey: KlaviyoProfilePropertyType,
    value: String
  ) => void;

  readonly resetProfile: () => void;

  /***
   TODO: we need to figure out how to handle callbacks in the native module given on
  iOS it's always a async call where as in Android it's seems a sync call
  may be we can handle it on the javascript side before calling into native modules
  so that the caller doesn't have to worry about it but if they don't await on the response
  on iOS things may not work as expected
   ***/
  readonly getEmail: (callback: Function | undefined) => String | null;
  readonly getExternalId: (callback: Function | undefined) => String | null;
  readonly getPhoneNumber: (callback: Function | undefined) => String | null;
}
