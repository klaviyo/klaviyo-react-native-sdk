import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

/*API interfaces for profile related operations*/
export interface KlaviyoProfileApi {
  readonly setProfile: (profile: Profile) => void;
  readonly setEmail: (email: String) => void;
  readonly setExternalId: (externalId: String) => void;
  readonly setPhoneNumber: (phoneNumber: String) => void;
  // TODO: TDB
  readonly setProfileAttribute: (
    propertyKey: KlaviyoProfilePropertyType,
    value: String
  ) => void;

  readonly resetProfile: () => void;

  readonly getEmail: (callback: Function | undefined) => String | null;
  readonly getExternalId: (callback: Function | undefined) => String | null;
  readonly getPhoneNumber: (callback: Function | undefined) => String | null;
}

/* Profile interface types */

const { PROFILE_KEYS } = KlaviyoReactNativeSdk.getConstants();

/* various profile properties that can be set on a user */
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

export interface Location {
  readonly address1?: string;
  readonly address2?: string;
  readonly city?: string;
  readonly country?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly region?: string;
  readonly zip?: string;
  readonly timezone?: string;
}

export interface Profile {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  title?: string;
  image?: string;
  location?: Location;
  properties?: Record<ProfileProperty, any>;
}

export type KlaviyoProfilePropertyType = ProfileProperty | string;
export type ProfileProperties = Record<KlaviyoProfilePropertyType, Object>;
