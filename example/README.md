# Klaviyo React Native SDK Example App

This example app demonstrates the full API surface of the Klaviyo React Native SDK, including profile management, event tracking, in-app forms, geofencing, and push notifications.

## Getting Started

### 1. Configure Your API Key

The app loads your Klaviyo public API key from a gitignored `.env` file via
[`react-native-dotenv`](https://github.com/goatandsheep/react-native-dotenv).

1. Copy the template: `cp .env.template .env`
2. Edit `.env` and set `KLAVIYO_API_KEY=` to your actual public API key
3. Restart Metro so the babel plugin picks up the new value

Notes:

- `.env` is gitignored — only `.env.template` is checked in.
- Without a `.env` file the app still builds and runs; it shows a friendly warning
  banner and the non-push features (profile, events, in-app forms, geofencing)
  continue to work without a key.

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

**Push is disabled by default.** The example app launches without any Firebase
configuration — the rest of the demo (profile management, events, in-app forms,
geofencing) still works, and the Push Notifications section just shows setup
instructions until you wire Firebase up.

Push notifications are handled via `@react-native-firebase/messaging` in the
JavaScript layer. This is the recommended approach for React Native apps — the
SDK is initialized from JS, and Firebase manages push tokens cross-platform.

### Firebase Setup

To enable push notifications, add your Firebase configuration files:

**iOS:**

1. Add `GoogleService-Info.plist` to `example/ios/KlaviyoReactNativeSdkExample/`
2. Run `pod install` from the `example/ios/` directory

**Android:**

1. Replace `example/android/app/google-services.json.template` with a real
   `google-services.json` from your Firebase project.
   - The template is a placeholder structure checked into the repo so that the
     Android build succeeds without real Firebase config. It lets the app run
     (with push simply disabled) on a cold clone. Replace it with a real
     `google-services.json` to enable push on Android.
   - `google-services.json` itself is gitignored — only the template is checked in.
2. Ensure `applicationId` in `build.gradle` matches your Firebase project.

The app automatically detects Firebase and enables push features once the config
files are in place.

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
