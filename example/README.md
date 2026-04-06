# Klaviyo React Native SDK Example App

This example app demonstrates the full API surface of the Klaviyo React Native SDK, including profile management, event tracking, in-app forms, geofencing, and push notifications.

## Getting Started

### 1. Configure Your API Key

The app loads your Klaviyo public API key from a gitignored config file.

1. Copy the template: `cp src/env.local.example.js src/env.local.js`
2. Edit `src/env.local.js` and replace `YOUR_KLAVIYO_PUBLIC_API_KEY` with your actual key
3. The app will show a warning banner if the key is not configured

### 2. Install Dependencies

```bash
yarn install
cd ios && pod install && cd ..
```

### 3. Run the App

```bash
# Start Metro bundler
yarn start

# Run iOS
yarn ios

# Run Android
yarn android
```

## Push Notifications

Push notifications are handled via `@react-native-firebase/messaging` in the JavaScript layer. This is the recommended approach for React Native apps — the SDK is initialized from JS, and Firebase manages push tokens cross-platform.

### Firebase Setup

To enable push notifications, add your Firebase configuration files:

**iOS:**
1. Add `GoogleService-Info.plist` to `ios/KlaviyoReactNativeSdkExample/`
2. Run `pod install` in the `ios/` directory

**Android:**
1. Add `google-services.json` to `android/app/`
2. Ensure `applicationId` in `build.gradle` matches your Firebase project

The app automatically detects Firebase and enables push features. If Firebase is not configured, the Push Notifications section displays setup instructions instead.

### Native Push (Alternative)

For apps that prefer to handle push tokens natively (e.g., brownfield apps), the native code in `AppDelegate.mm` and `MainApplication.kt` contains commented-out reference implementations. See those files for details.

Note: `Klaviyo.handlePush(intent)` in `MainActivity.kt` is always required on Android — push open tracking depends on native intent handling regardless of how tokens are managed.

## Features Demonstrated

- **Profile Management** — Set email, phone, external ID individually or together; reset profile
- **Event Tracking** — Create test events and Viewed Product events
- **In-App Forms** — Register/unregister with configurable session timeout
- **Geofencing** — Location permission flow, register/unregister, list current geofences
- **Push Notifications** — Firebase-based permission request, token display, badge count (iOS)
- **Deep Linking** — Universal tracking link handling via `Linking` API
