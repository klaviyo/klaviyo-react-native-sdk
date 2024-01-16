import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

/*API interfaces for profile related operations*/
export interface KlaviyoProfileApi {
  readonly setProfile: (profile: Profile) => void;
  readonly setExternalId: (externalId: String) => void;
  readonly getExternalId: (callback: Function | undefined) => String | null;
  readonly setEmail: (email: String) => void;
  readonly getEmail: (callback: Function | undefined) => String | null;
  readonly setPhoneNumber: (phoneNumber: String) => void;
  readonly getPhoneNumber: (callback: Function | undefined) => String | null;
  readonly setProfileAttribute: (
    propertyKey: ProfilePropertyKey,
    value: String
  ) => void;
  readonly resetProfile: () => void;
}

/* Profile interface types */

const { PROFILE_KEYS } = KlaviyoReactNativeSdk.getConstants();

/* various profile properties that can be set on a user */
export enum ProfileProperty {
  EXTERNAL_ID = PROFILE_KEYS.EXTERNAL_ID ?? 'external_id',
  EMAIL = PROFILE_KEYS.EMAIL ?? 'email',
  PHONE_NUMBER = PROFILE_KEYS.PHONE_NUMBER ?? 'phone_number',

  FIRST_NAME = PROFILE_KEYS.FIRST_NAME ?? 'first_name',
  LAST_NAME = PROFILE_KEYS.LAST_NAME ?? 'last_name',
  TITLE = PROFILE_KEYS.TITLE ?? 'title',
  ORGANIZATION = PROFILE_KEYS.ORGANIZATION ?? 'organization',
  IMAGE = PROFILE_KEYS.IMAGE ?? 'image',

  ADDRESS1 = PROFILE_KEYS.ADDRESS1 ?? 'address1',
  ADDRESS2 = PROFILE_KEYS.ADDRESS2 ?? 'address2',
  CITY = PROFILE_KEYS.CITY ?? 'city',
  COUNTRY = PROFILE_KEYS.COUNTRY ?? 'country',
  ZIP = PROFILE_KEYS.ZIP ?? 'zip',
  REGION = PROFILE_KEYS.REGION ?? 'region',
  LATITUDE = PROFILE_KEYS.LATITUDE ?? 'latitude',
  LONGITUDE = PROFILE_KEYS.LONGITUDE ?? 'longitude',
  TIMEZONE = PROFILE_KEYS.TIMEZONE ?? 'timezone',

  LOCATION = PROFILE_KEYS.LOCATION ?? 'location',
  PROPERTIES = PROFILE_KEYS.TIMEZONE ?? 'properties',
}

export interface Location {
  readonly address1?: string;
  readonly address2?: string;
  readonly city?: string;
  readonly country?: string;
  readonly zip?: string;
  readonly region?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly timezone?: string;
}

export interface Profile {
  externalId?: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  organization?: string;
  image?: string;
  location?: Location;
  properties?: Record<ProfileProperty, any>;
}

/**
 * Convert a Profile object to a Record<ProfileProperty, any> object
 * where the keys are the ProfileProperty enum values mapped to the native module's constants
 *
 * @param profile
 */
export function formatProfile(profile: Profile): Record<ProfileProperty, any> {
  let bridgedProfile: Record<ProfileProperty, any> = {};

  if (profile.externalId) {
    bridgedProfile[ProfileProperty.EXTERNAL_ID] = profile.externalId;
  }

  if (profile.email) {
    bridgedProfile[ProfileProperty.EMAIL] = profile.email;
  }

  if (profile.phoneNumber) {
    bridgedProfile[ProfileProperty.PHONE_NUMBER] = profile.phoneNumber;
  }

  if (profile.firstName) {
    bridgedProfile[ProfileProperty.FIRST_NAME] = profile.firstName;
  }

  if (profile.lastName) {
    bridgedProfile[ProfileProperty.LAST_NAME] = profile.lastName;
  }

  if (profile.title) {
    bridgedProfile[ProfileProperty.TITLE] = profile.title;
  }

  if (profile.organization) {
    bridgedProfile[ProfileProperty.ORGANIZATION] = profile.organization;
  }

  if (profile.image) {
    bridgedProfile[ProfileProperty.IMAGE] = profile.image;
  }

  if (profile.location) {
    let bridgedLocation: Record<ProfileProperty, any> = {};

    if (profile.location.address1) {
      bridgedLocation[ProfileProperty.ADDRESS1] = profile.location.address1;
    }

    if (profile.location.address2) {
      bridgedLocation[ProfileProperty.ADDRESS2] = profile.location.address2;
    }

    if (profile.location.city) {
      bridgedLocation[ProfileProperty.CITY] = profile.location.city;
    }

    if (profile.location.country) {
      bridgedLocation[ProfileProperty.COUNTRY] = profile.location.country;
    }

    if (profile.location.zip) {
      bridgedLocation[ProfileProperty.ZIP] = profile.location.zip;
    }

    if (profile.location.region) {
      bridgedLocation[ProfileProperty.REGION] = profile.location.region;
    }

    if (profile.location.latitude) {
      bridgedLocation[ProfileProperty.LATITUDE] = profile.location.latitude;
    }

    if (profile.location.longitude) {
      bridgedLocation[ProfileProperty.LONGITUDE] = profile.location.longitude;
    }

    if (profile.location.timezone) {
      bridgedLocation[ProfileProperty.TIMEZONE] = profile.location.timezone;
    }

    bridgedProfile[ProfileProperty.LOCATION] = bridgedLocation;
  }

  if (profile.properties) {
    bridgedProfile[ProfileProperty.PROPERTIES] = profile.properties;
  }

  return bridgedProfile;
}

export type ProfilePropertyKey = ProfileProperty | string;
export type ProfileProperties = Record<ProfilePropertyKey, Object>;
