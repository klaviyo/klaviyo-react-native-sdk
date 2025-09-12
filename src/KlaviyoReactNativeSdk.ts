import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'klaviyo-react-native-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

export const KlaviyoReactNativeSdk = NativeModules.KlaviyoReactNativeSdk
  ? NativeModules.KlaviyoReactNativeSdk
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export const KlaviyoDeepLinkEventEmitter =
  NativeModules.KlaviyoDeepLinkEventEmitter
    ? NativeModules.KlaviyoDeepLinkEventEmitter
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );
