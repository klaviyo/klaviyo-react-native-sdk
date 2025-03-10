import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'klaviyo-react-native-sdk/forms' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const KlaviyoFormsModule = NativeModules.KlaviyoFormsReactNativeSdk;

export const KlaviyoFormsReactNativeSdk = KlaviyoFormsModule
  ? KlaviyoFormsModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );
