# klaviyo-react-native-sdk

⚠️ This repository is in beta development ⚠️

Official Klaviyo React Native SDK

## Overview

klaviyo-react-native-sdk is an SDK, written in TypeScript, that can be integrated into your React Native App.
The SDK enables you to engage with your customers using push notifications. In addition, you will be able to take advantage of Klaviyo's identification and event tracking functionality.
Once integrated, your marketing team will be able to better understand your app users' needs and send them timely messages via APNs/Google FCM.

This SDK is a wrapper (native module bridge) around the native Klaviyo iOS and Android SDKs.
For more information on the native SDKs, please see the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk) and [Android](https://github.com/klaviyo/klaviyo-android-sdk) repositories.

## Installation

The Klaviyo React Native SDK is available via [NPM](http://npmjs.com). To add it to your project, run the following from your project's root directory:

```sh
npm install klaviyo-react-native-sdk
```

### iOS Setup

To get started with iOS setup, you need to run the following command in the `ios` directory of your React Native project:

```sh
pod install
```

This may require you to install [Cocoapods](https://cocoapods.org/).

Once you have installed all the dependencies using cocoapods, you should have access to the native Klaviyo iOS SDK which we will use in the following section to setup your react native iOS project.

### Android Setup

For Android, there are no additional installation requirements. The React Native SDK gradle file exposes transitive dependencies upon the Klaviyo Android SDK
so you can import in your kotlin/java classes without modifying your gradle files.

## SDK Initialization

Initialization should be done from the native layer:

### Android

Follow the [Android](https://github.com/klaviyo/klaviyo-android-sdk#Initialization) guide on initializing.

### iOS

Here we'll create the native iOS SDK instance and initialize it with your Klaviyo public key.

```swift
KlaviyoSDK().initialize(with: "YOUR_KLAVIYO_PUBLIC_API_KEY")
```

## Identifying a Profile

The SDK provides helpers for identifying profiles and syncing via the
[Klaviyo client API](https://developers.klaviyo.com/en/reference/create_client_profile).
All profile identifiers (email, phone, external ID, anonymous ID) are persisted to local storage
so that the SDK can keep track of the current profile.

The Klaviyo SDK does not validate email address or phone number inputs locally. See
[documentation](https://help.klaviyo.com/hc/en-us/articles/360046055671-Accepted-phone-number-formats-for-SMS-in-Klaviyo)
for guidance on proper phone number formatting.

Profile attributes can be set all at once:

```typescript
import { Klaviyo, Profile } from 'klaviyo-react-native-sdk';

const profile: Profile = {
  email: 'kermit@example.com',
  phone: '+15555555555',
  externalId: '12345',
  firstName: 'Kermit',
  lastName: 'The Frog',
  title: 'CEO',
  organization: 'Muppets, Inc.',
  location: {
    latitude: 42.3601,
    longitude: 71.0589,
  },
};
Klaviyo.setProfile(profile);
```

or individually:

```typescript
import { ProfilePropertyKey, Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.setEmail('kermit@example.com');
Klaviyo.setPhone('+15555555555');
Klaviyo.setExternalId('12345');
Klaviyo.setProfileAttribute(ProfilePropertyKey.FIRST_NAME, 'Kermit');
```

If a user is logged out or if you want to reset the profile for some reason, use the following:

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.resetProfile();
```

## Event Tracking

The SDK also provides tools for tracking analytics events to the Klaviyo API.
A list of common Klaviyo-defined event names is provided in [MetricName](https://github.com/klaviyo/klaviyo-react-native-sdk/blob/master/src/Event.ts), or
you can just provide a string for a custom event name.

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
Klaviyo.createEvent(event);
```

## Push Notifications

When setting up push notifications (including rich push notifications), you will need to follow directions from the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#Push-Notifications) and [Android](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#Push-Notifications) SDKs.

## Deep Linking

To handle deep links in your app, start by familiarizing yourself with the React Native [guide](https://reactnative.dev/docs/linking) to deep linking. Once you've done that, you should follow directions from the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#Deep-Linking) and [Android](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#Deep-Linking) SDKs.
The sections below give additional details for each platform as it pertains to React Native.

### iOS

As shown in the native SDK documentation, you can follow option 1 or 2.

With option 1, when you get the callback, you can handle it as follows:

```objective-c
[RCTLinkingManager application:application openURL:url options:options]
```

Since you won't have `options`, you can just pass in an empty dictionary for that parameter.

With option 2, when you handle the open url (in [`application(_:open:options)`](https://developer.apple.com/documentation/uikit/uiapplicationdelegate/1623112-application)),
you call the linking code block above similar to what you would do with option 1.

### Android

On Android, simply follow the [Android SDK docs](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#Deep-Linking) on handling intent filters.

### React Native Changes

Then on the React Native side, you can handle the deep link as follows:

```typescript
import { Linking } from 'react-native';

Linking.addEventListener('url', (event) => {
  console.log(event.url);
});

Linking.getInitialURL().then((url) => {
  console.log('Initial Url: url', url);
});
```

## Push Permissions

It is recommended that handling push permissions be done from the native layer. On iOS, you can follow the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#sending-push-notifications) guide on requesting permissions. On Android, you can follow the [Android](https://source.android.com/docs/core/display/notification-perm) guide on requesting permissions.

## Contributing

See the [contributing guide](.github/CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License
The Klaviyo React Native SDK is available under the MIT license. See [LICENSE](./LICENSE) for more info.

## Code Documentation
Browse complete autogenerated code documentation [here](https://klaviyo.github.io/klaviyo-react-native-sdk/).
