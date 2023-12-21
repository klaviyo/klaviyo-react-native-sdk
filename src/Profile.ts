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

type KlaviyoProfilePropertyType = ProfileProperty | string;
type ProfileProperties = Record<KlaviyoProfilePropertyType, Object>;

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

  readonly getEmail: () => String | null;
  readonly getExternalId: () => String | null;
  readonly getPhoneNumber: () => String | null;
}
