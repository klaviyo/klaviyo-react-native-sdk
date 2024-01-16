import { EventName } from 'klaviyo-react-native-sdk';

export const generateRandomEmails = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
  let string = '';
  for (let ii = 0; ii < 15; ii++) {
    string += chars[Math.floor(Math.random() * chars.length)];
  }
  return string + '@gmail.com';
};

export const generateRandomPhoneNumber = () => {
  const getRandomDigit = () => Math.floor(Math.random() * 10);
  const lineNumber = `${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`;

  return `+1${234}${567}${lineNumber}`;
};

export const generateRandomName = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomName = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomName += characters.charAt(randomIndex);
  }

  return randomName;
};

export const generateRandomAddress = () => {
  const streets = ['Main St', 'Elm St', 'Oak Ave', 'Cedar Ln', 'Maple Rd'];
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'];
  const states = ['CA', 'NY', 'TX', 'FL', 'IL'];
  const zipCodes = ['10001', '90001', '60601', '77001', '33101'];

  const randomStreet = streets[Math.floor(Math.random() * streets.length)];
  const randomCity = cities[Math.floor(Math.random() * cities.length)];
  const randomState = states[Math.floor(Math.random() * states.length)];
  const randomZipCode = zipCodes[Math.floor(Math.random() * zipCodes.length)];

  return {
    street: randomStreet,
    city: randomCity,
    state: randomState,
    zipCode: randomZipCode,
  };
};

export const getRandomMetric: () => EventName = () => {
  const eventNames = [
    EventName.VIEWED_PRODUCT_METRIC,
    EventName.STARTED_CHECKOUT_METRIC,
    EventName.OPENED_APP_METRIC,
    EventName.ADDED_TO_CART_METRIC,
  ];

  const randomIndex = Math.floor(Math.random() * eventNames.length);

  return (eventNames[randomIndex] as EventName) ?? EventName.OPENED_APP_METRIC;
};
