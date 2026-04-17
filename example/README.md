# Klaviyo React Native SDK Example App

The example app is a reference integration of the Klaviyo React Native SDK. It demonstrates
a basic Klaviyo integration with all major SDK features including:

- Initialization
- Analytics
- Push Notifications
- Geofencing
- Deep Linking
- In-App Forms

## Integration Step Comments

The example source is annotated with `RN|iOS|Android Installation Step` comments that mark
the code an integrator needs to replicate in their own app. Grep for any of those prefixes  
across `example/` to walk the integration surface:

- `RN Installation Step` — `example/src/App.tsx` and `example/index.js` (SDK init,
  API key sourcing, optional `@react-native-firebase/messaging` background handler)
- `iOS Installation Step` — `example/ios/KlaviyoReactNativeSdkExample/AppDelegate.{h,mm}`,
  `PushNotificationsHelper.swift`, `NotificationService.swift`, and the Podfile
- `Android Installation Step` — `example/android/build.gradle`, `app/build.gradle`,
  `AndroidManifest.xml`, and `MainActivity.kt`

## Getting Started

### 1. Configure Your API Key

The app loads your Klaviyo public API key from a gitignored `.env` file via
[`react-native-dotenv`](https://github.com/goatandsheep/react-native-dotenv).

1. Copy the template: `cp .env.template .env`
2. Edit `.env` and set `KLAVIYO_API_KEY=` to your actual public API key (`.env` is gitignored)
3. Restart Metro with `yarn start --reset-cache` so the metro picks up the new value

> **If you hit "Klaviyo API key not configured" after setting up `.env`:** Metro inlines
> `.env` values at bundle time via `react-native-dotenv`. If Metro was already running when
> you created or edited `.env`, it will serve a cached bundle with `KLAVIYO_API_KEY` still
> undefined. Stop Metro and restart it with `yarn start --reset-cache` (from `example/`).

### 2. Install Dependencies

The one-liner, run from the repo root:

```bash
# From the repo root
yarn example setup

# This alias runs:
#   yarn install --immutable           (repo root)
#   bundle install                     (example/)
#   bundle exec pod install            (example/ios/)
```

### 3. Run the App

Preferred — from the repo root (yarn workspaces entry point):

```bash
# From the repo root
yarn example start
yarn example android
yarn example ios
```

## Push Notifications

Push notifications are handled via `@react-native-firebase/messaging` in the
JavaScript layer — the Klaviyo SDK is initialized from JS, and Firebase manages
push tokens cross-platform.

### Platform-specific Firebase setup

**Android** builds and runs out of the box without Firebase configured. The
`com.google.gms.google-services` plugin is conditionally applied only when
`google-services.json` is present. Without the file, push features are dormant
but everything else (profile, events, in-app forms, geofencing) works normally.

- To enable push: drop a real `google-services.json` from your Firebase project
  into `example/android/app/`. The file is gitignored. Ensure the
  `applicationId` in `example/android/app/build.gradle`
  (`com.klaviyoreactnativesdkexample`) is registered as an Android app in your
  Firebase project.

**iOS** requires a `GoogleService-Info.plist` at `example/ios/` to build at all — the Xcode
project's Resources build phase references it unconditionally. Two options:

- **To enable push:** drop a real `GoogleService-Info.plist` from your Firebase
  project at `example/ios/GoogleService-Info.plist` (gitignored). Ensure your
  iOS bundle identifier is registered in the same Firebase project.
- **To build without push:** write a stub plist at the same path. The values
  below are format-valid (39-char `API_KEY` starting with `A`, full
  `GOOGLE_APP_ID` format), so `FirebaseApp.configure()` succeeds at launch.
  Firebase will log a benign "couldn't register with backend" warning at
  runtime since the project isn't real — that's expected, not a bug. The rest
  of the app works normally.
  <details>
  <summary>Stub <code>GoogleService-Info.plist</code></summary>

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>BUNDLE_ID</key><string>com.klaviyoreactnativesdkexample</string>
    <key>GOOGLE_APP_ID</key><string>1:000000000000:ios:0000000000000000000000</string>
    <key>API_KEY</key><string>AIzaSyA00000000000000000000000000000000</string>
    <key>GCM_SENDER_ID</key><string>000000000000</string>
    <key>PROJECT_ID</key><string>stub-project</string>
    <key>STORAGE_BUCKET</key><string>stub-project.appspot.com</string>
    <key>PLIST_VERSION</key><string>1</string>
    <key>IS_GCM_ENABLED</key><true/>
    <key>IS_ADS_ENABLED</key><false/>
    <key>IS_ANALYTICS_ENABLED</key><false/>
    <key>IS_APPINVITE_ENABLED</key><false/>
    <key>IS_SIGNIN_ENABLED</key><false/>
  </dict>
  </plist>
  ```

  </details>

### Native push (alternative)

For apps that prefer to handle push tokens natively (e.g., brownfield apps), the
Klaviyo iOS and Android SDKs both have their own native push APIs. See the
`AppDelegate.mm` comments on iOS and `MainApplication.kt` comments on Android for
pointers, plus the platform SDKs' READMEs:

- iOS: https://github.com/klaviyo/klaviyo-swift-sdk#push-notifications
- Android: https://github.com/klaviyo/klaviyo-android-sdk#push-notifications

Note: both platforms require native-layer push-open handling regardless of how tokens
are managed:

- **Android:** `Klaviyo.handlePush(intent)` in `MainActivity.kt` (`onCreate` +
  `onNewIntent`) — covers cold-start taps and resume-from-background taps.
- **iOS:** `[PushNotificationsHelper handleReceivingPushWithResponse:...]` inside
  the `userNotificationCenter:didReceiveNotificationResponse:withCompletionHandler:`
  delegate in `AppDelegate.mm`, plus the `getLaunchOptionsWithURL` helper to
  forward any cold-start deep-link URL (React Native issue
  [#32350](https://github.com/facebook/react-native/issues/32350)).
