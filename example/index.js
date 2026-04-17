import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// @react-native-firebase/messaging requires a background message handler to be
// registered at module load — before AppRegistry.registerComponent — or it will
// warn on every cold start ("No task registered for key ReactNativeFirebaseMessagingHeadlessTask").
// See https://rnfirebase.io/reference/messaging#setBackgroundMessageHandler
//
// For Klaviyo push, this is a no-op: Klaviyo delivers notifications through
// APNs (iOS) / the FCM token registered with the Klaviyo backend (Android), NOT
// through FCM data messages that would reach this handler. It exists only to
// silence the RNFB warning. An integrator using Firebase for other push senders
// alongside Klaviyo would forward relevant payloads here.
//
// The require is guarded so the example still runs when Firebase pods aren't
// linked (i.e., no GoogleService-Info.plist / google-services.json configured).
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch {
  // Firebase not available — no-op.
}

AppRegistry.registerComponent(appName, () => App);
