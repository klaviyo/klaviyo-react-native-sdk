import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { PROFILE_KEYS } = KlaviyoReactNativeSdk.getConstants();

export const {
  EXTERNAL_ID,
  EMAIL,
  PHONE_NUMBER,

  FIRST_NAME,
  LAST_NAME,
  TITLE,
  ORGANIZATION,
  IMAGE,

  ADDRESS1,
  ADDRESS2,
  CITY,
  COUNTRY,
  ZIP,
  REGION,
  LATITUDE,
  LONGITUDE,
  TIMEZONE,
} = PROFILE_KEYS;

export class Profile {
  public externalId?: String;
  public email?: String;
  public phoneNumber?: String;
  public properties?: Map<String, String> = new Map();
}

export interface IKlaviyoProfileApi {
  readonly setProfile: (profile: Object) => void;
  readonly setProfileAttribute: (propertyKey: String, value: String) => void;
  readonly setEmail: (email: String) => void;
  readonly setExternalId: (externalId: String) => void;
  readonly setPhoneNumber: (phoneNumber: String) => void;

  readonly resetProfile: () => void;

  readonly getEmail: () => String | null;
  readonly getExternalId: () => String | null;
  readonly getPhoneNumber: () => String | null;
}
