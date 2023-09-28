import React from 'react';
import {Button} from 'react-native';
import {NativeModules} from 'react-native';
const KlaviyoInterface = () => {
  const generateRandomEmails = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
    let string = '';
    for (let ii = 0; ii < 15; ii++) {
      string += chars[Math.floor(Math.random() * chars.length)];
    }
    return string + '@gmail.com';
  };

  const generateRandomPhoneNumber = () => {
    const getRandomDigit = () => Math.floor(Math.random() * 10);
    const lineNumber = `${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`;

    return `+1${234}${567}${lineNumber}`;
  };

  const generateRandomName = length => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let randomName = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomName += characters.charAt(randomIndex);
    }

    return randomName;
  };

  const generateRandomAddress = () => {
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

  async function setPhoneNumber() {
    try {
      NativeModules.Klaviyo.setPhoneNumber(generateRandomPhoneNumber());
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  }
  async function setEmail() {
    try {
      NativeModules.Klaviyo.setEmail(generateRandomEmails());
      // NativeModules.Klaviyo.setPhoneNumber('9824239480');
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  }

  async function initSDK() {
    try {
      NativeModules.Klaviyo.initializeWithApiKey('Xr5bFG');
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  }

  const onInit = async () => {
    await initSDK();
  };

  const onEmail = async () => {
    await setEmail();
  };

  const onPhoneNumber = async () => {
    await setPhoneNumber();
  };

  const onPushPermission = async () => {
    try {
      const granted = await NativeModules.Klaviyo.requestPushPermission([
        'badge',
        'alert',
        'sound',
      ]);

      console.log('granted === ', granted);

      if (granted) {
        console.log('registering for remote notifications');
        NativeModules.Klaviyo.registerForRemoteNotifications();
      }
    } catch (e: any) {
      console.log('push permission error', e);
    }
  };

  const onSetProfile = async () => {
    try {
      NativeModules.Klaviyo.setProfile(
        generateRandomEmails(),
        generateRandomPhoneNumber(),
        generateRandomName(8),
        generateRandomName(7),
        generateRandomName(4),
        generateRandomName(5),
        generateRandomName(6),
        'test image',
        generateRandomAddress().street,
        '',
        generateRandomAddress().city,
        'USA',
        99,
        99,
        generateRandomAddress().city,
        generateRandomAddress().zipCode,
        'test timezone',
        {
          'test key 1': generateRandomName(5),
          'test key 2': Math.floor(Math.random() * 90) + 10,
        },
      );
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onResetProfile = async () => {
    try {
      NativeModules.Klaviyo.resetProfile();
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onExternalId = async () => {
    try {
      NativeModules.Klaviyo.setExternalId(generateRandomName(5));
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onGetEmail = async () => {
    try {
      NativeModules.Klaviyo.getEmail(value => {
        console.log('email is =', value);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onGetPhoneNumber = async () => {
    try {
      NativeModules.Klaviyo.getPhoneNumber(phoneNumber => {
        console.log('phone number is = ', phoneNumber);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onGetExternalId = async () => {
    try {
      NativeModules.Klaviyo.getExternalId(externalId => {
        console.log('external id = ', externalId);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onGetPushToken = async () => {
    try {
      NativeModules.Klaviyo.getPushToken(token => {
        console.log('push token = ', token);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onSendTestEvent = async () => {
    try {
      NativeModules.Klaviyo.sendTestEvent();
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onHelloWorld = async () => {
    console.log("trying to log");
    NativeModules.Klaviyo.helloWorld()
  }

  return (
    <>
      <Button title="Click to init the SDK" color="#841584" onPress={onInit} />

      <Button
        title="Click to set the full profile"
        color="#841584"
        onPress={onSetProfile}
      />

      <Button
        title="Click to set the email"
        color="#841584"
        onPress={onEmail}
      />

      <Button
        title="Click to set the phone number"
        color="#841584"
        onPress={onPhoneNumber}
      />

      <Button
        title="Click to set external id"
        color="#841584"
        onPress={onExternalId}
      />

      <Button
        title="Click to request push notification persmission"
        color="#841584"
        onPress={onPushPermission}
      />

      <Button
        title="Click to RESET the full profile"
        color="#ffcccb"
        onPress={onResetProfile}
      />

      <Button
        title="Click to get current email"
        color="#841584"
        onPress={onGetEmail}
      />

      <Button
        title="Click to get phone number"
        color="#841584"
        onPress={onGetPhoneNumber}
      />

      <Button
        title="Click to get external id"
        color="#841584"
        onPress={onGetExternalId}
      />

      <Button
        title="Click to get push token"
        color="#841584"
        onPress={onGetPushToken}
      />

      <Button
        title="Click to send test event"
        color="#841584"
        onPress={onSendTestEvent}
      />

      <Button
        title="ANDROID hello world"
        color="#841584"
        onPress={onHelloWorld}
      />
    </>
  );
};

export default KlaviyoInterface;
