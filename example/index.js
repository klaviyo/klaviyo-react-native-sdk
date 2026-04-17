import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// Register a background message handler BEFORE AppRegistry.registerComponent.
// @react-native-firebase/messaging requires the handler to be attached
// before the app mounts — otherwise iOS may suspend the process before the
// handler is ready and the background push is dropped. The handler is a
// no-op here; a real app would forward the payload to
// Klaviyo.handleBackgroundMessage or similar.
// The require is guarded so the app still runs when Firebase isn't linked.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch {
  // Firebase not available — no-op.
}

AppRegistry.registerComponent(appName, () => App);
