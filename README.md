# klaviyo-react-native-sdk

⚠️ Please note that this repository is still in alpha development ⚠️

Official Klaviyo React Native SDK

## Overview

klaviyo-react-native-sdk is an SDK, written in TypeScript, that can be integrated into your React Native App. The SDK enables you to engage with your customers using push notifications. In addition, you will be able to take advantage of Klaviyo's identification and event tracking functionality. Once integrated, your marketing team will be able to better understand your app users' needs and send them timely messages via APNs/Google FCM.

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

Once you have installed Cocoapods, you will need to follow some setup steps from the iOS SDK [README](https://github.com/klaviyo/klaviyo-swift-sdk/blob/master/README.md).

### Android Setup

For Android, simply follow any initialization instructions as indicated [here](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#configuration).

## SDK Initialization

Initialization should be done from the native layer:
### Android
Follow the [Android](https://github.com/klaviyo/klaviyo-android-sdk#configuration) guide on configuration.
### iOS
Follow the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#:~:text=To%20add%20Klaviyo%27s,YOUR_KLAVIYO_PUBLIC_API_KEY%22) guide on configuration.

## Event Tracking

The SDK also provides tools for tracking analytics events to the Klaviyo API.
A list of common Klaviyo-defined event names is provided in [MetricName](https://github.com/klaviyo/klaviyo-react-native-sdk/blob/main/src/Event.ts), or
you can just provide a string for a custom event name:

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.createEvent({
  name: 'My Custom Event',
});
Klaviyo.createEvent(event);
```

Additional event properties can be specified as part of the `Event`

```typescript
import { Event, Klaviyo, EventName } from 'klaviyo-react-native-sdk';

const event: Event = {
  name: EventName.ADDED_TO_CART_METRIC,
  properties: {
    'Item Name': 'Shirt',
    'Item Size': 'Large',
    'Item Price': 19.99,
  },
};
Klaviyo.createEvent(event);
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

## Push Notifications

When setting up push notifications (including rich push notifications), you will need to follow directions from the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#push-notifications) and [Android](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#push-notifications) SDKs.

## Deep Linking

To handle deep links in your app, start by familiarizing yourself with the React Native [guide](https://reactnative.dev/docs/linking) to deep linking. Once you've done that, you should follow directions from the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#handling-deep-linking) and [Android](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#deep-linking-in-push-notification) SDKs.
The sections below give additional details for each platform as it pertains to React Native.

### iOS

As shown in the native SDK documentation, you can follow option 1 or 2.

With option 1, when you get the callback, you can handle it as follows:

```objective-c
[RCTLinkingManager application:application openURL:url options:options]
```

Since you won't have `options`, you can just pass in an empty dictionary for that parameter.

With option 2, when you handle the open url (in `application(_:open:options)`), you call the linking as in option 1.

### Android

On Android, simply follow the Android SDK docs on handling intent filters.

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

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---
