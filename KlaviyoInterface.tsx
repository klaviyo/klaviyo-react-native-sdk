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

    const areaCode = `${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`;
    const centralOfficeCode = `${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`;
    const lineNumber = `${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}${getRandomDigit()}`;

    return `+1${areaCode}${centralOfficeCode}${lineNumber}`;
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

      console.log("granted === ", granted);

      if (granted) {
        console.log('registering for remote notifications');
        NativeModules.Klaviyo.registerForRemoteNotifications();
      }
    } catch (e: any) {
      console.log('push permission error', e);
    }
  };

  return (
    <>
      <Button title="Click to init the SDK" color="#841584" onPress={onInit} />

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
        title="Click to request push notification persmission"
        color="#841584"
        onPress={onPushPermission}
      />
    </>
  );
};

export default KlaviyoInterface;
