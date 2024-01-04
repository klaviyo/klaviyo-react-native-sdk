import {
  Klaviyo,
  type Profile,
  ProfileProperty,
  type Event,
  type Location,
} from 'klaviyo-react-native-sdk';

import {
  generateRandomAddress,
  generateRandomEmails,
  generateRandomName,
  generateRandomPhoneNumber,
  getRandomEvent,
} from './RandomGenerators';

export const initialize = async () => {
  try {
    Klaviyo.initialize('YOUR_PUBLIC_API_KEY');
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setEmail = async () => {
  try {
    Klaviyo.setEmail(generateRandomEmails());
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setPhoneNumber = async () => {
  try {
    Klaviyo.setPhoneNumber(generateRandomPhoneNumber());
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setExternalId = async () => {
  try {
    Klaviyo.setExternalId(generateRandomName(5));
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getEmail = async () => {
  try {
    Klaviyo.getEmail((value: string) => {
      console.log('email is =', value);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getPhoneNumber = async () => {
  try {
    Klaviyo.getPhoneNumber((phoneNumber: string) => {
      console.log('phone number is = ', phoneNumber);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getExternalId = async () => {
  try {
    Klaviyo.getExternalId((externalId: string) => {
      console.log('external id = ', externalId);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const getPushToken = async () => {
  try {
    Klaviyo.getPushToken((token: string) => {
      console.log('push token = ', token);
    });
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const resetProfile = async () => {
  try {
    Klaviyo.resetProfile();
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const setProfileAttribute = async () => {
  try {
    Klaviyo.setProfileAttribute("CUSTOM", generateRandomName(12));
  } catch (e: any) {
    console.log(e.message, e.code);
  }
}

export const setProfile = async () => {
  try {
    const myLocation: Location = {
      address1: generateRandomAddress().street,
      address2: 'apt 123',
      city: generateRandomAddress().city,
      country: 'USA',
      latitude: 99,
      longitude: 99,
      region: generateRandomAddress().city,
      zip: generateRandomAddress().zipCode,
      timezone: 'EST',
    };

    const myProperties: Record<ProfileProperty, any> = {
      [ProfileProperty.FIRST_NAME]: generateRandomName(5),
      [ProfileProperty.LAST_NAME]: generateRandomName(5),
      [ProfileProperty.ADDRESS1]: generateRandomAddress().street,
      [ProfileProperty.ADDRESS2]: 'Apt 456',
      [ProfileProperty.TITLE]: 'Mr.',
      [ProfileProperty.ORGANIZATION]: 'ABC Inc.',
      [ProfileProperty.CITY]: 'Cityville',
      [ProfileProperty.REGION]: 'Regionville',
      [ProfileProperty.COUNTRY]: 'Countryland',
      [ProfileProperty.ZIP]: '12345',
      [ProfileProperty.IMAGE]: 'profile.jpg',
      [ProfileProperty.LATITUDE]: 40.7128,
      [ProfileProperty.LONGITUDE]: -74.006,
    };

    const myProfile: Profile = {
      email: generateRandomEmails(),
      phoneNumber: generateRandomPhoneNumber(),
      externalId: generateRandomName(8),
      firstName: generateRandomName(7),
      lastName: generateRandomName(4),
      organization: generateRandomName(5),
      title: generateRandomName(6),
      image: 'test image',
      location: myLocation,
      properties: myProperties,
    };

    Klaviyo.setProfile(myProfile);
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};

export const sendRandomEvent = async () => {
  try {
    const event: Event = {
      name: getRandomEvent(),
      properties: { abc: 'def' },
      uniqueId: generateRandomName(5),
    };
    Klaviyo.createEvent(event);
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};
