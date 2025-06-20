# klaviyo-react-native-sdk

[![Android](https://github.com/klaviyo/klaviyo-react-native-sdk/actions/workflows/android-ci.yml/badge.svg?branch=master&event=push)](https://github.com/klaviyo/klaviyo-react-native-sdk/actions/workflows/android-ci.yml)
[![iOS](https://github.com/klaviyo/klaviyo-react-native-sdk/actions/workflows/ios-ci.yml/badge.svg?branch=master&event=push)](https://github.com/klaviyo/klaviyo-react-native-sdk/actions/workflows/ios-ci.yml)

## Contents

- [klaviyo-react-native-sdk](#klaviyo-react-native-sdk)
  - [Introduction](#introduction)
  - [Requirements](#requirements)
    - [React Native](#react-native)
    - [Android](#android)
    - [iOS](#ios)
  - [Installation](#installation)
    - [Android](#android-1)
    - [iOS](#ios-1)
  - [Initialization](#initialization)
    - [React Native Initialization](#react-native-initialization)
    - [Native Initialization](#native-initialization)
  - [Identifying a Profile](#identifying-a-profile)
    - [Reset Profile](#reset-profile)
    - [Anonymous Tracking](#anonymous-tracking)
  - [Event Tracking](#event-tracking)
  - [Push Notifications](#push-notifications)
    - [Prerequisites](#prerequisites)
    - [Setup](#setup)
    - [Collecting Push Tokens](#collecting-push-tokens)
      - [React Native Token Collection](#react-native-token-collection)
      - [Native Token Collection](#native-token-collection)
    - [Receiving Push Notifications](#receiving-push-notifications)
    - [Rich Push](#rich-push)
    - [Badge Count](#badge-count)
    - [Tracking Open Events](#tracking-open-events)
    - [Deep Linking](#deep-linking)
    - [Silent Push Notifications](#silent-push-notifications)
    - [Custom Data](#custom-data)
  - [In-App Forms](#in-app-forms)
    - [Prerequisites](#prerequisites-1)
    - [Setup](#setup-1)
    - [Behavior](#behavior)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)
  - [License](#license)
  - [Code Documentation](#code-documentation)

## Introduction

> We currently don't have support for expo. This is something we are looking into and should be available in the future.

The Klaviyo React Native SDK allows developers to incorporate Klaviyo analytics and push notification functionality in
their React Native applications for Android and iOS. It is a Typescript wrapper (native module bridge) around the native
Klaviyo iOS and Android SDKs. For more information on the native SDKs, please see the
[iOS](https://github.com/klaviyo/klaviyo-swift-sdk) and [Android](https://github.com/klaviyo/klaviyo-android-sdk).
repositories. This repo also contains a basic [React Native sample app](./example) to assist your integration.

The SDK assists in identifying users and tracking user events via the latest [Klaviyo Client APIs](https://developers.klaviyo.com/en/reference/api_overview).
To reduce performance overhead, API requests are queued and sent in batches. The queue is persisted to local storage
so that data is not lost if the device is offline or the app is terminated.

Once integrated, your marketing team will be able to better understand your app users' needs and send them timely
push notifications via FCM (Firebase Cloud Messaging) and APNs (Apple Push Notification Service).

## Requirements

This SDK was developed and tested against React Native 0.78, as a new-architecture compatible native module.

### React Native

We support all maintained [React Native versions](https://reactnative.dev/versions), 0.70+.
We have successfully compiled this SDK on a bare React Native template app down to `0.68.7`.

### Android

- `minSdkVersion` of `23+`
- `compileSdkVersion` of `34+`

### iOS

- Minimum Deployment Target `13.0+`

## Installation

The Klaviyo React Native SDK is available via [NPM](http://npmjs.com). To add it to your project,
run the following from your project's root directory:

```sh
# Using npm
npm install klaviyo-react-native-sdk

# Using yarn
yarn add klaviyo-react-native-sdk
```

### Example App

We have included an example app in this repository for reference of how to integrate with our SDK.
It is primarily intended to give code samples such as how and where to `initialize`, implement notification
delegate methods on iOS, and handle an opened notification intent on Android. We've commented the sample app
code to call out key setup steps, search for `iOS Installation Step` and `Android Installation Step`.

To run the example app:

- Clone this repository
- From the root directory, run `yarn example-setup`. This is an alias that will do the following:
  - Run `yarn install --immutable` from the root directory
  - Navigate to the `example` directory and run `bundle install`
  - Navigate to the `example/ios` directory and run `bundle exec pod install`
- Android configuration:
  - To initialize Klaviyo from the native layer, open `example/android/gradle.properties` and follow the
    instructions to set your `publicApiKey` and verify `initializeKlaviyoFromNative` is enabled.
  - If you wish to run the Android example app with push/firebase, you'll need to copy a `google-services.json`
    file into `example/android/app/src` and update the `applicationId` in `app/build.gradle` to match your application ID.
    Then, open `example/android/gradle.properties` and follow the instructions to enable `useNativeFirebase`.
    This is disabled by default because the app will crash on launch without a `google-services.json` file.
- From the project's root directory, use the following commands start a metro server and run the example app.
  - `yarn example start` - to start the metro server
  - `yarn example android` - to run the example app on an Android emulator or device
  - `yarn example ios` - to run the example app on an iOS simulator

### Android

Android installation requirements may vary depending upon your project configuration and other dependencies.
The Klaviyo React Native SDK's `build.gradle` file exposes transitive dependencies upon the Klaviyo Android SDK,
so you can import Android Klaviyo SDK references from your Kotlin/Java files without modifying your gradle configuration.

#### React Native 0.74+

There are no additional installation requirements. Android support is fully tested and verified.

#### React Native 0.68.x - 0.72.x

We have successfully compiled the Klaviyo React Native SDK in a bare React Native template app for these versions
with the following modifications to the `android/build.gradle` file:

- Set `minSdkVersion=23`
- Set `compileSdkVersion=34`

See [Android Troubleshooting](Troubleshooting.md#android-troubleshooting) for possible exceptions.

### iOS

After installing the npm package, run the following command in the `ios` directory of your React Native project.
Install [Cocoapods](https://cocoapods.org/) if you have not already.

```sh
pod install
```

You may also need to run `pod update` or `pod install --repo-update` after updating your SDK version.

## Initialization

The SDK must be initialized with the short alphanumeric [public API key](https://help.klaviyo.com/hc/en-us/articles/115005062267#difference-between-public-and-private-api-keys1)
for your Klaviyo account, also known as your Site ID.

Initialize _must_ be called prior to invoking any other SDK methods so that Klaviyo SDK can track profiles, events and
push tokens toward the correct Klaviyo account. Any SDK operations invoked before initialize will be dropped,
and result in a logged error.

You can call `initialize` from your app's React Native layer or from the platform-specific native code.
This decision is dependent on your app's architecture. It is not required to initialize the SDK in both places!
Note: It is safe to re-initialize, e.g. if your app needs to switch between more than one Klaviyo account.

### React Native Initialization

Below is an example of how to initialize the SDK from your React Native code:

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';
Klaviyo.initialize('YOUR_KLAVIYO_PUBLIC_API_KEY');
```

### Native Initialization

Follow the native SDK instructions for initialization, and refer to the
[example app](./example) in this repository for guidance:

- [Android SDK instructions](https://github.com/klaviyo/klaviyo-android-sdk#Initialization), and
  [example app `MainApplication.kt`](./example/android/app/src/main/java/com/klaviyoreactnativesdkexample/MainApplication.kt#L39)
- [iOS SDK instructions](https://github.com/klaviyo/klaviyo-swift-sdk#Initialization), and
  [example app `AppDelegate.mm`](./example/ios/KlaviyoReactNativeSdkExample/AppDelegate.mm#L14)

## Identifying a Profile

The SDK provides methods to identify profiles via the
[Create Client Profile API](https://developers.klaviyo.com/en/reference/create_client_profile).
A profile can be identified by any combination of the following:

- External ID: A unique identifier used by customers to associate Klaviyo profiles with profiles in an external system,
  such as a point-of-sale system. Format varies based on the external system.
- Individual's email address
- Individual's phone number in [E.164 format](https://help.klaviyo.com/hc/en-us/articles/360046055671#h_01HE5ZYJEAHZKY6WZW7BAD36BG)

Identifiers are persisted to local storage on each platform so that the SDK can keep track of the current profile.

Profile attributes can be set all at once:

```typescript
import { Klaviyo, Profile } from 'klaviyo-react-native-sdk';

const profile: Profile = {
  email: 'kermit@example.com',
  phoneNumber: '+15555555555',
  externalId: '12345',
  firstName: 'Kermit',
  lastName: 'The Frog',
  title: 'CEO',
  organization: 'Muppets, Inc.',
  location: {
    address1: '666 Fake St.',
    address2: 'Apt 123',
    city: 'Cityville',
    country: 'Countryland',
    region: 'Regionville',
    zip: '11111',
  },
};
Klaviyo.setProfile(profile);
```

or individually:

```typescript
import { ProfileProperty, Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.setEmail('kermit@example.com');
Klaviyo.setPhone('+15555555555');
Klaviyo.setExternalId('12345');
Klaviyo.setProfileAttribute(ProfileProperty.FIRST_NAME, 'Kermit');
```

Either way, the native SDKs will group and batch API calls to improve performance.

### Reset Profile

To start a _new_ profile altogether (e.g. if a user logs out), either call `Klaviyo.resetProfile()`
to clear the currently tracked profile identifiers (e.g. on logout), or use `Klaviyo.setProfile(profile)`
to overwrite it with a new profile object.

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.resetProfile();
```

### Anonymous Tracking

Klaviyo will track unidentified users with an autogenerated ID whenever a push token is set or an event is created.
That way, you can collect push tokens and track events prior to collecting profile identifiers such as email or
phone number. When an identifier is provided, Klaviyo will merge the anonymous user with an identified user.

## Event Tracking

The SDK also provides tools for tracking analytics events via the
[Create Client Event API](https://developers.klaviyo.com/en/reference/create_client_event).
A list of common Klaviyo-defined event metrics is provided in [`MetricName`](https://github.com/klaviyo/klaviyo-react-native-sdk/blob/master/src/Event.ts),
or you can just provide a string for a custom event name.

Below is an example using one of the Klaviyo-defined event names:

```typescript
import { Event, Klaviyo, EventName } from 'klaviyo-react-native-sdk';

const event: Event = {
  name: EventName.STARTED_CHECKOUT_METRIC,
  value: 99,
  properties: { products: ['SKU1', 'SKU2'] },
};

Klaviyo.createEvent(event);
```

You can also create an event by providing a string for the event name as follows:

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.createEvent({
  name: 'My Custom Event',
});
```

## Push Notifications

### Prerequisites

Integrating push notifications is highly platform-specific. Begin by thoroughly reviewing the setup
instructions for Push Notifications in the README from each native Klaviyo SDK:

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Push-Notifications)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Push-Notifications)

### Setup

Refer to the following README sections on push setup:

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Setup)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Setup)

### Collecting Push Tokens

Push tokens can be collected either from your app's react native code or in the native code.
Below sections discuss both approaches, and you are free to pick one that best suits your app's architecture.
Note that doing this in one location is sufficient.

#### React Native Token Collection

In order to collect the APNs push token in your React Native code you need to:

1. Import a library such as [`@react-native-firebase/messaging`](https://www.npmjs.com/package/@react-native-firebase/messaging)
   to your react native project. The below instructions are specific for `@react-native-firebase/messaging` library.
2. Import Firebase iOS SDK to your iOS project. Setup instructions can be found [here](https://firebase.google.com/docs/ios/setup).
3. In order for the `UNUserNotificationCenter` delegate methods to be called in `AppDelegate`, method swizzling must be
   disabled for the Firebase SDK. For more information on this, please refer to the [Firebase documentation](https://firebase.google.com/docs/cloud-messaging/ios/client).
   Disable method swizzling by adding the following to your `Info.plist`:
   ```xml
   <key>FirebaseAppDelegateProxyEnabled</key>
   <false/>
   ```
4. In `application:didRegisterForRemoteNotificationsWithDeviceToken:` method in your `AppDelegate.m` file, you can add the following code to set the push token to the firebase SDK:
   ```objective-c
   // since we disbaled swizzling, we have to manually set this
   FIRMessaging.messaging.APNSToken = deviceToken;
   ```
5. Finally, in your React Native code, you can collect & set the push token as follows:

   ```typescript
   import messaging from '@react-native-firebase/messaging';
   import { Klaviyo } from 'klaviyo-react-native-sdk';
   import { Platform } from 'react-native';

   const fetchAndSetPushToken = async () => {
     try {
       let deviceToken: string | null = null;
       if (Platform.OS === 'android') {
         // For Android, Klaviyo requires the FCM token
         deviceToken = await messaging().getToken();
         console.log('FCM Token:', deviceToken);
       } else if (Platform.OS === 'ios') {
         // For iOS, Klaviyo requires the APNs token
         deviceToken = await messaging().getAPNSToken();
         console.log('APNs Token:', deviceToken);
       }

       if (deviceToken != null && deviceToken.length > 0) {
         Klaviyo.setPushToken(deviceToken!);
       }
     } catch (error) {
       console.error('Error in fetchAndSetPushToken:', error);
     }
   };
   ```

For Android token collection, there isn't any additional setup required on the native side. The above code should work as is.

#### Native Token Collection

Follow the platform-specific instructions below:

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Collecting-Push-Tokens)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Collecting-Push-Tokens)

#### Notification Permission

Requesting user permission to display notifications can be managed from the React Native code, or from platform-specific
native code. Note that either of these approaches is sufficient to inform the Klaviyo SDK of the permission change.

1. **React Native Notification Permission**:
   You can leverage a third party library that provides cross-platform permissions APIs like firebase [`react-native-firebase/messaging`](https://www.npmjs.com/package/@react-native-firebase/messaging).
   If you opt for a cross-platform permission solution, call the Klaviyo React Native SDK's `setToken` method to refresh
   the token's enablement status.

   Below is an example of how to use `@react-native-firebase/messaging` to request permission and set the token:

   ```typescript
   import messaging from '@react-native-firebase/messaging';

   const requestUserPermission = async () => {
     let isAuthorized = false;

     if (Platform.OS === 'android') {
       const androidAuthStatus = await PermissionsAndroid.request(
         PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
       );
       isAuthorized = androidAuthStatus === 'granted';
     } else if (Platform.OS === 'ios') {
       const iOsAuthStatus = await messaging().requestPermission();
       isAuthorized =
         iOsAuthStatus === messaging.AuthorizationStatus.AUTHORIZED ||
         iOsAuthStatus === messaging.AuthorizationStatus.PROVISIONAL;
     }

     // refer the `fetchAndSetPushToken` method from the previous section for how to get and set the push token

     if (isAuthorized) {
       console.log('User has notification permissions enabled.');
     } else {
       console.log('User has notification permissions disabled');
     }
   };
   ```

2. **Native Notification Permission**:
   Follow instructions from our native SDK documentation to request permission from native code:

   - [Android](https://github.com/klaviyo/klaviyo-android-sdk#collecting-push-tokens)
   - [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#request-push-notification-permission)

   If you requested permission using native code then continue using Klaviyo's native platform SDKs `setToken`
   method to inform the SDK of permission change.

### Receiving Push Notifications

You can send test notifications to a specific token using the
[push notification preview](https://help.klaviyo.com/hc/en-us/articles/18011985278875)
feature in order to test your integration.

#### Rich Push

[Rich Push](https://help.klaviyo.com/hc/en-us/articles/16917302437275) is the ability to add images to
push notification messages. On iOS, you will need to implement an extension service to attach images to notifications.
No additional setup is needed to support rich push on Android.

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Rich-Push)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Rich-Push)

#### Badge Count

Klaviyo supports setting or incrementing the badge count on iOS when you send a push notification.
To enable this functionality, you will need to implement a notification service extension and app group
as detailed in the [Swift SDK installation instructions](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#installation).
See the [badge count documentation](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#badge-count) for more details and the example app for reference.
Android automatically handles badge counts, and no additional setup is needed.

#### Tracking Open Events

Klaviyo tracks push opens events with a specially formatted event `Opened Push` that includes message tracking
parameters in the event properties. To track push opens, you will need to follow platform-specific instructions.
Currently, tracking push open events must be done from the native code due to platform differences that prevent
us from bridging this functionality into the React Native SDK code.

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Tracking-Open-Events)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Tracking-Open-Events)

> Note: If you initialize Klaviyo from React Native code, be aware that on both platforms the timing of when
> an `Opened Push` event gets triggered can sometimes occur before your React Native code to initialize our SDK
> can execute. To mitigate this, our SDK holds the request in memory until initialization occurs.

#### Deep Linking

[Deep Links](https://help.klaviyo.com/hc/en-us/articles/14750403974043) allow you to navigate to a particular
page within your app in response to the user opening a notification. Familiarize yourself with the
[React Native Guide](https://reactnative.dev/docs/linking) to deep linking, then read through the platform-specific
instructions below.

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Deep-Linking) instructions for handling intent filters
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Deep-Linking)
  As shown in the native SDK documentation, you can follow option 1 or 2.

  With option 1, when you handle the open url (in [`application(_:open:options)`](https://developer.apple.com/documentation/uikit/uiapplicationdelegate/1623112-application)),
  you call the linking code block above similar to what you would do with option 1.

  With option 2, when you get the `deepLinkHandler`, you can handle it as follows:

  ```objective-c
    [RCTLinkingManager application:UIApplication.sharedApplication openURL: url options: @{}];
  ```

  For application, you can pass in an instance of `UIApplication` and since you won't have `options`, you can just pass in an empty dictionary for that parameter.

In your React Native code, you can handle the deep link as follows:

```typescript
import { Linking } from 'react-native';

Linking.addEventListener('url', (event) => {
  console.log(event.url);
});

Linking.getInitialURL().then((url) => {
  console.log('Initial Url: url', url);
});
```

#### Silent Push Notifications

Silent push notifications (also known as background pushes) allow your app to receive payloads from Klaviyo without displaying a visible alert to the user. These are typically used to trigger background behavior, such as displaying content, personalizing the app interface, or downloading new information from a server. To receive silent push notifications, follow the platform-specific instructions below:

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Silent-Push-Notifications)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Silent-Push-Notifications)

#### Custom Data

Klaviyo messages can also include key-value pairs (custom data) for both standard and silent push notifications. To receive custom data, follow the platform-specific instructions below:

- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Custom-Data)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Custom-Data)

## In-App Forms

[In-app forms](https://help.klaviyo.com/hc/en-us/articles/34567685177883) are messages displayed to mobile app users while they are actively using an app. You can create new in-app forms in a drag-and-drop editor in the Sign-Up Forms tab in Klaviyo. Follow the instructions in this section to integrate forms with your app. The SDK will display forms according to their targeting and behavior settings and collect delivery and engagement analytics automatically.

### Prerequisites

- Using Version 1.2.0 and higher
- Import the Klaviyo module

### Setup

To display in-app forms, add the following code to your application

```
import { Klaviyo } from "klaviyo-react-native-sdk";
...

// call this any time after initializing your public API key
Klaviyo.registerForInAppForms();
```

### Behavior

Once `registerForInAppForms()` is called, the SDK will load form data for your account and display no more than one form within 15 seconds, based on form targeting and behavior settings.

You can call `registerForInAppForms()` any time after initializing with your public API key to control when and where in your app's UI a form can appear. It is safe to register multiple times per application session. The SDK will internally prevent multiple forms appearing at once.

Consider how often you want to register for forms. For example, registering from a lifecycle event is advisable so that the user has multiple opportunities to see your messaging if they are browsing your app for a prolonged period. However, be advised the form will be shown as soon as it is ready, so you may still need to condition this based on the user's context within your application. Future versions of this product will provide more control in this regard.

| Callback                                                                                             | Description                                                             |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `const handleAppStateChange = async (nextAppState: string) => {  Klaviyo.registerForInAppForms(); }` | Anytime the app is foregrounded, check for forms and show if available. |
| `function App(): JSX.Element { useEffect(() => {  Klaviyo.registerForInAppForms(); }};`              | Show a form upon initial app launch.                                    |

**Note**: At this time, when device orientation changes any currently visible form is closed and will not be re-displayed automatically.

## Troubleshooting

Use the [troubleshooting guide](Troubleshooting.md) to resolve common issues with the Klaviyo React Native SDK.
If the issues you are facing isn't in the troubleshooting guide, and you believe it's a bug in the SDK,
please file an [issue](https://github.com/klaviyo/klaviyo-react-native-sdk/issues) in our repository.

## Contributing

Refer to the [contributing guide](.github/CONTRIBUTING.md) to learn how to contribute to the Klaviyo React Native SDK.
We welcome your feedback in the
[issues](https://github.com/klaviyo/klaviyo-react-native-sdk/issues) section of our public GitHub repository.

## License

The Klaviyo React Native SDK is available under the terms of the MIT license. See [LICENSE](./LICENSE) for more info.

## Code Documentation

Browse complete autogenerated code documentation [here](https://klaviyo.github.io/klaviyo-react-native-sdk/).
