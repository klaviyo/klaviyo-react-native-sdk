import * as React from 'react';

import { StyleSheet, View, Text, Button } from 'react-native';
import { Klaviyo, EventProperty } from 'klaviyo-react-native-sdk';

export default function App() {
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

  const generateRandomName = (length: number) => {
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

  const onInit = async () => {
    await initSDK();
  };

  const onEmail = async () => {
    await setEmail();
  };

  const onPhoneNumber = async () => {
    await setPhoneNumber();
  };

  const onExternalId = async () => {
    try {
      Klaviyo.setExternalId(generateRandomName(5));
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  async function setPhoneNumber() {
    try {
      Klaviyo.setPhoneNumber(generateRandomPhoneNumber());
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  }
  async function setEmail() {
    try {
      Klaviyo.setEmail(generateRandomEmails());
      // NativeModules.Klaviyo.setPhoneNumber('9824239480');
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  }

  async function initSDK() {
    try {
      // TODO: this is only used for testing in debug mode
      Klaviyo.initialize('Xr5bFG');
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  }

  const onGetEmail = async () => {
    try {
      Klaviyo.getEmail((value: string) => {
        console.log('email is =', value);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onGetPhoneNumber = async () => {
    try {
      Klaviyo.getPhoneNumber((phoneNumber: string) => {
        console.log('phone number is = ', phoneNumber);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onGetExternalId = async () => {
    try {
      Klaviyo.getExternalId((externalId: string) => {
        console.log('external id = ', externalId);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onGetPushToken = async () => {
    try {
      Klaviyo.getPushToken((token: string) => {
        console.log('push token = ', token);
      });
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  const onResetProfile = async () => {
    try {
      Klaviyo.resetProfile();
    } catch (e: any) {
      console.log(e.message, e.code);
    }
  };

  return (
    <View style={styles.container}>
      <>
        <Button
          title="Click to init the SDK (ONLY FOR TESTING IN DEBUG MODE))"
          color="#841584"
          onPress={onInit}
        />

        {/*<Button*/}
        {/*  title="Click to set the full profile"*/}
        {/*  color="#841584"*/}
        {/*  onPress={onSetProfile}*/}
        {/*/>*/}

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

        {/*<Button*/}
        {/*  title="Click to request push notification permission"*/}
        {/*  color="#841584"*/}
        {/*  onPress={onPushPermission}*/}
        {/*/>*/}

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

        {/*<Button*/}
        {/*  title="Click to send test event"*/}
        {/*  color="#841584"*/}
        {/*  onPress={onSendTestEvent}*/}
        {/*/>*/}
      </>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
