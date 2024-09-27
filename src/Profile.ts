import { KlaviyoReactNativeSdk } from './KlaviyoReactNativeSdk';

const { PROFILE_KEYS } = KlaviyoReactNativeSdk.getConstants();

/**
 * Interface for the Klaviyo Profile API
 */
export interface KlaviyoProfileApi {
  /**
   * Create and update properties about a profile without tracking an associated event.
   * @param profile - The profile object to set
   */
  setProfile(profile: Profile): void;

  /**
   * Update a profile's external ID.
   * @param externalId - The external ID to set
   */
  setExternalId(externalId: string): void;

  /**
   * Retrieve a profile's external ID.
   * @param callback - The callback function to handle the response
   */
  getExternalId(callback: Function | undefined): string | null;

  /**
   * Update a profile's email address.
   * @param email - The email address to set
   */
  setEmail(email: string): void;

  /**
   * Retrieve a profile's email address.
   * @param callback - The callback function to handle the response
   */
  getEmail(callback: Function | undefined): string | null;

  /**
   * Update a profile's phone number.
   * @param phoneNumber - The phone number to set
   */
  setPhoneNumber(phoneNumber: string): void;

  /**
   * Retrieve a profile's phone number.
   * @param callback - The callback function to handle the response
   */
  getPhoneNumber(callback: Function | undefined): string | null;

  /**
   * Update a profile's properties.
   * @param propertyKey - The property key to set
   * @param value - The property value to set
   */
  setProfileAttribute(propertyKey: ProfilePropertyKey, value: string): void;

  /**
   * Clear the current profile and set it to a new anonymous profile
   */
  resetProfile(): void;
}

/**
 * Enum for various profile properties that can be set on a user
 */
export enum ProfileProperty {
  /**
   * Individual's first name
   */
  FIRST_NAME = PROFILE_KEYS.FIRST_NAME ?? 'first_name',

  /**
   * Individual's last name
   */
  LAST_NAME = PROFILE_KEYS.LAST_NAME ?? 'last_name',

  /**
   * Individual's job title
   */
  TITLE = PROFILE_KEYS.TITLE ?? 'title',

  /**
   * Name of the company or organization within the company for whom the individual works
   */
  ORGANIZATION = PROFILE_KEYS.ORGANIZATION ?? 'organization',

  /**
   * URL pointing to the location of a profile image
   */
  IMAGE = PROFILE_KEYS.IMAGE ?? 'image',

  /**
   * First line of street address
   */
  ADDRESS1 = PROFILE_KEYS.ADDRESS1 ?? 'address1',

  /**
   * Second line of street address
   */
  ADDRESS2 = PROFILE_KEYS.ADDRESS2 ?? 'address2',

  /**
   * City name
   */
  CITY = PROFILE_KEYS.CITY ?? 'city',

  /**
   * Country name
   */
  COUNTRY = PROFILE_KEYS.COUNTRY ?? 'country',

  /**
   * Zip code
   */
  ZIP = PROFILE_KEYS.ZIP ?? 'zip',

  /**
   * Region within a country, such as state or province
   */
  REGION = PROFILE_KEYS.REGION ?? 'region',

  /**
   * Latitude coordinate. We recommend providing a precision of four decimal places.
   */
  LATITUDE = PROFILE_KEYS.LATITUDE ?? 'latitude',

  /**
   * Longitude coordinate. We recommend providing a precision of four decimal places.
   */
  LONGITUDE = PROFILE_KEYS.LONGITUDE ?? 'longitude',

  /**
   * Time zone name. We recommend using time zones from the IANA Time Zone Database.
   */
  TIMEZONE = PROFILE_KEYS.TIMEZONE ?? 'timezone',

  /**
   * An object containing location information for this profile
   */
  LOCATION = PROFILE_KEYS.LOCATION ?? 'location',

  /**
   * An object containing key/value pairs for any custom properties assigned to this profile
   */
  PROPERTIES = PROFILE_KEYS.PROPERTIES ?? 'properties',
}

/**
 * Interface for location information of a profile
 */
export interface Location {
  /**
   * First line of street address
   */
  readonly address1?: string;

  /**
   * Second line of street address
   */
  readonly address2?: string;

  /**
   * City name
   */
  readonly city?: string;

  /**
   * Country name
   */
  readonly country?: string;

  /**
   * Zip code
   */
  readonly zip?: string;

  /**
   * Region within a country, such as state or province
   */
  readonly region?: string;

  /**
   * Latitude coordinate. We recommend providing a precision of four decimal places.
   */
  readonly latitude?: number;

  /**
   * Longitude coordinate. We recommend providing a precision of four decimal places.
   */
  readonly longitude?: number;

  /**
   * Time zone name. We recommend using time zones from the IANA Time Zone Database.
   */
  readonly timezone?: string;
}

/**
 * Interface for a profile
 */
export interface Profile {
  /**
   * A unique identifier used by customers to associate Klaviyo profiles with profiles in an external system, such as a point-of-sale system. Format varies based on the external system.
   */
  readonly externalId?: string;

  /**
   * Individual's email address
   */
  readonly email?: string;

  /**
   * Individual's phone number in E.164 format
   */
  readonly phoneNumber?: string;

  /**
   * Individual's first name
   */
  readonly firstName?: string;

  /**
   * Individual's last name
   */
  readonly lastName?: string;

  /**
   * Individual's job title
   */
  readonly title?: string;

  /**
   * Name of the company or organization within the company for whom the individual works
   */
  readonly organization?: string;

  /**
   * URL pointing to the location of a profile image
   */
  readonly image?: string;

  /**
   * An object containing location information for this profile
   */
  readonly location?: Location;

  /**
   * An object containing key/value pairs for any custom properties assigned to this profile
   */
  readonly properties?: ProfileProperties;
}

/**
 * Convert a Profile object to a Record<ProfileProperty, Object> object
 * where the keys are the ProfileProperty enum values mapped to the native module's constants
 *
 * @param profile {@link Profile} - The profile object to convert
 */
export function formatProfile(
  profile: Profile
): Record<ProfileProperty, Object> {
  let bridgedProfile: Record<ProfileProperty, Object> = {};

  if (profile.externalId) {
    const key = PROFILE_KEYS.EXTERNAL_ID ?? 'external_id';
    bridgedProfile[key] = profile.externalId;
  }

  if (profile.email) {
    const key = PROFILE_KEYS.EMAIL ?? 'email';
    bridgedProfile[key] = profile.email;
  }

  if (profile.phoneNumber) {
    const key = PROFILE_KEYS.PHONE_NUMBER ?? 'phone_number';
    bridgedProfile[key] = profile.phoneNumber;
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
    let bridgedLocation: Record<ProfileProperty, Object> = {};

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

/**
 * Type for a profile property key
 */
export type ProfilePropertyKey = ProfileProperty | string;

/**
 * Type for profile properties
 */
export type ProfileProperties = Record<ProfilePropertyKey, Object>;
