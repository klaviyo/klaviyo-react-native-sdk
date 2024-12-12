import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'klaviyo-react-native-sdk/ui' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const KlaviyoUIModule = NativeModules.KlaviyoUIBridge;

export const KlaviyoUIReactNative = KlaviyoUIModule
  ? KlaviyoUIModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );
