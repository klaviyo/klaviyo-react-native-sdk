import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { PROFILE_KEYS } = KlaviyoReactNativeSdk.getConstants();

console.log('PROFILE_KEYS = ', PROFILE_KEYS);

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

  //TODO: need to consolidate the below methods into one method
  readonly setProfileNew: (profile: ProfileModel) => void;
}

// TODO: Code for profile API using w/o using the profile property keys

interface Location {
  readonly address1?: string | null;
  readonly address2?: string | null;
  readonly city?: string | null;
  readonly country?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly region?: string | null;
  readonly zip?: string | null;
  readonly timezone?: string | null;
}

// TODO: this might have to come form the native module at some point to avoid mismatch between the native module and the javascript module but on iOS this is an internal model so we'd have to do some iOS SDK changes
export enum ProfileKey {
  FirstName = 'first_name',
  LastName = 'last_name',
  Address1 = 'address1',
  Address2 = 'address2',
  Title = 'title',
  Organization = 'organization',
  City = 'city',
  Region = 'region',
  Country = 'country',
  Zip = 'zip',
  Image = 'image',
  Latitude = 'latitude',
  Longitude = 'longitude',
  Custom = 'custom',
  EXTERNAL_ID = 'external_id',
}

interface ProfileNew {
  email?: string | null;
  phoneNumber?: string | null;
  externalId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  organization?: string | null;
  title?: string | null;
  image?: string | null;
  location?: Location | null;
  properties?: Record<ProfileKey, any> | null;
}

export class LocationModel implements Location {
  readonly address1?: string | null;
  readonly address2?: string | null;
  readonly city?: string | null;
  readonly country?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly region?: string | null;
  readonly zip?: string | null;
  readonly timezone?: string | null;

  constructor(
    address1: string | null = null,
    address2: string | null = null,
    city: string | null = null,
    country: string | null = null,
    latitude: number | null = null,
    longitude: number | null = null,
    region: string | null = null,
    zip: string | null = null,
    timezone: string | null = null
  ) {
    this.address1 = address1;
    this.address2 = address2;
    this.city = city;
    this.country = country;
    this.latitude = latitude;
    this.longitude = longitude;
    this.region = region;
    this.zip = zip;
    this.timezone = timezone;
  }
}

export class ProfileModel implements ProfileNew {
  readonly email?: string | null;
  readonly phoneNumber?: string | null;
  readonly externalId?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly organization?: string | null;
  readonly title?: string | null;
  readonly image?: string | null;
  readonly location?: LocationModel | null;
  readonly properties?: Record<ProfileKey, any> | null;

  constructor(
    email: string | null = null,
    phoneNumber: string | null = null,
    externalId: string | null = null,
    firstName: string | null = null,
    lastName: string | null = null,
    organization: string | null = null,
    title: string | null = null,
    image: string | null = null,
    location: LocationModel | null = null,
    properties: Record<ProfileKey, any> | null = null
  ) {
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.externalId = externalId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.organization = organization;
    this.title = title;
    this.image = image;
    this.location = location;
    this.properties = properties || null;
  }
}
