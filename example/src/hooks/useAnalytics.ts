import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  Klaviyo,
  EventName,
  ProfileProperty,
  type Event,
  type Location,
  type Profile,
} from 'klaviyo-react-native-sdk';

export function useAnalytics() {
  // Identity
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [externalId, setExternalId] = useState('');

  // Attributes
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');

  // Location
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [zip, setZip] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    console.log('[useAnalytics] mounted');

    Klaviyo.getEmail((value: string) => {
      if (value) setEmail(value);
    });

    Klaviyo.getPhoneNumber((value: string) => {
      if (value) setPhoneNumber(value);
    });

    Klaviyo.getExternalId((value: string) => {
      if (value) setExternalId(value);
    });
  }, []);

  // Identity handlers (individual setters)
  const handleSetEmail = () => {
    Klaviyo.setEmail(email);
  };

  const handleSetPhoneNumber = () => {
    Klaviyo.setPhoneNumber(phoneNumber);
  };

  const handleSetExternalId = () => {
    Klaviyo.setExternalId(externalId);
  };

  // Attribute handlers (via setProfileAttribute with a typed ProfileProperty enum)
  const handleSetFirstName = () => {
    Klaviyo.setProfileAttribute(ProfileProperty.FIRST_NAME, firstName);
  };

  const handleSetLastName = () => {
    Klaviyo.setProfileAttribute(ProfileProperty.LAST_NAME, lastName);
  };

  const handleSetTitle = () => {
    Klaviyo.setProfileAttribute(ProfileProperty.TITLE, title);
  };

  const handleSetOrganization = () => {
    Klaviyo.setProfileAttribute(ProfileProperty.ORGANIZATION, organization);
  };

  const handleSetCity = () => {
    Klaviyo.setProfileAttribute(ProfileProperty.CITY, city);
  };

  const handleSetCountry = () => {
    Klaviyo.setProfileAttribute(ProfileProperty.COUNTRY, country);
  };

  const handleSetZip = () => {
    Klaviyo.setProfileAttribute(ProfileProperty.ZIP, zip);
  };

  // Build a Location from the current form fields, or null if every field is blank.
  // Shared by handleSetLocation (location-only setProfile) and handleSetProfile
  // (full-profile setProfile).
  const buildLocation = (): Location | null => {
    const cityT = city.trim();
    const countryT = country.trim();
    const zipT = zip.trim();
    const lat = latitude.trim() ? parseFloat(latitude) : undefined;
    const lon = longitude.trim() ? parseFloat(longitude) : undefined;
    const hasLocation =
      cityT || countryT || zipT || Number.isFinite(lat) || Number.isFinite(lon);
    if (!hasLocation) return null;
    return {
      city: cityT || undefined,
      country: countryT || undefined,
      zip: zipT || undefined,
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
    };
  };

  // Location requires the structured `Location` type. `setProfileAttribute` accepts
  // only string values, so we use `setProfile({ location })` as the canonical path.
  const handleSetLocation = () => {
    const location = buildLocation();
    if (!location) return;
    Klaviyo.setProfile({ location });
  };

  // Aggregate: build a full Profile object from every non-empty form field and
  // call setProfile(profile) in a single shot. Demonstrates Klaviyo.setProfile().
  const handleSetProfile = () => {
    const profile: Profile = {
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
      externalId: externalId || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      title: title || undefined,
      organization: organization || undefined,
      location: buildLocation() ?? undefined,
    };
    Klaviyo.setProfile(profile);
  };

  const handleResetProfile = () => {
    Alert.alert(
      'Reset Profile',
      'Are you sure you want to reset the profile? This will clear all profile data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            Klaviyo.resetProfile();
            setEmail('');
            setPhoneNumber('');
            setExternalId('');
            setFirstName('');
            setLastName('');
            setTitle('');
            setOrganization('');
            setCity('');
            setCountry('');
            setZip('');
            setLatitude('');
            setLongitude('');
          },
        },
      ]
    );
  };

  // Event handlers
  const handleCreateTestEvent = () => {
    const event: Event = {
      name: 'Test Event',
      value: 42.0,
      uniqueId: Date.now().toString(),
      properties: { 'System Time': Date.now() },
    };
    Klaviyo.createEvent(event);
  };

  const handleViewedProduct = () => {
    const event: Event = {
      name: EventName.VIEWED_PRODUCT_METRIC,
      properties: { Product: 'Lily Pad' },
      value: 99.99,
    };
    Klaviyo.createEvent(event);
  };

  return {
    // Identity state
    email,
    setEmail,
    phoneNumber,
    setPhoneNumber,
    externalId,
    setExternalId,

    // Attribute state
    firstName,
    setFirstName,
    lastName,
    setLastName,
    title,
    setTitle,
    organization,
    setOrganization,

    // Location state
    city,
    setCity,
    country,
    setCountry,
    zip,
    setZip,
    latitude,
    setLatitude,
    longitude,
    setLongitude,

    // Identity handlers
    handleSetEmail,
    handleSetPhoneNumber,
    handleSetExternalId,

    // Attribute handlers
    handleSetFirstName,
    handleSetLastName,
    handleSetTitle,
    handleSetOrganization,
    handleSetCity,
    handleSetCountry,
    handleSetZip,

    // Location + aggregate
    handleSetLocation,
    handleSetProfile,
    handleResetProfile,

    // Event handlers
    handleCreateTestEvent,
    handleViewedProduct,
  };
}
