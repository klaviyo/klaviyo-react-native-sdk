import { KlaviyoUI } from 'klaviyo-react-native-sdk';

export const helloWorld = async () => {
  try {
    console.log('KlaviyoUI - Hello World!');
    KlaviyoUI.helloWorld();
  } catch (e: any) {
    console.log(e.message, e.code);
  }
};
