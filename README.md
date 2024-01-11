# klaviyo-react-native-sdk

Official Klaviyo React Native SDK

## Overview

klaviyo-react-native-sdk is an SDK, written in TypeScript that can be integrated into your React Native App. The SDK enables you to engage with your customers using push notifications. In addition you will be able to take advantage of Klaviyo's identification and event tracking functionality. Once integrated, your marketing team will be able to better understand your app users' needs and send them timely messages via APNs/Google FCM.

## Installation

The Klaviyo React Native SDK is available via [NPM](http://npmjs.com). To add it to your project run the following:

```sh
npm install klaviyo-react-native-sdk
```

### iOS Setup

To get started with iOS setup you need to run the following command in your ios directory:

```sh
cocopods install
```

This may require you to install [Cocoapods](https://cocoapods.org/).

Once you have installed Cocoapods. You will need to follow some setup steps from the iOS SDK [README](https://github.com/klaviyo/klaviyo-swift-sdk/blob/master/README.md).

### Android Setup

To get started with Android setup you need to add the following to your `android/build.gradle` file:

`gradle /// help me with this??`

Once you have added the above to your `build.gradle` file you will need to follow some setup steps from the Android SDK [README](https://github.com/klaviyo/klaviyo-android-sdk/blob/master/README.md).

## SDK Initialization

Initialization can typically be done from the native layer but if you want to initialize the SDK from the React Native layer you can do so by calling the following:

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.initialize('YOUR_PUBLIC_API_KEY');
```

## Event Tracking

The SDK also provides tools for tracking analytics events to the Klaviyo API.
A list of common Klaviyo-defined event names is provided in [MetricName](https://github.com/klaviyo/klaviyo-react-native-sdk/blob/main/src/Event.ts), or
you can just provide a string for a custom event name:

```typescript
import { KlaviyoEventAPI, MetricName } from 'klaviyo-react-native-sdk';

KlaviyoEventAPI.createEvent({
  name: 'My Custom Event',
});
KlaviyoEventAPI.createEvent(event);
```

Additional event properties can be specified as part of `EventModel`

```typescript
import { Klaviyo, MetricName } from 'klaviyo-react-native-sdk'

val event = {
    name: MetricName.ADDED_TO_CART,
    properties: {
        "Item Name": "Shirt",
        "Item Size": "Large",
        "Item Price": 19.99
    }
}
Klaviyo.createEvent(event)
```

## Identifying a Profile

The SDK provides helpers for identifying profiles and syncing via the
[Klaviyo client API](https://developers.klaviyo.com/en/reference/create_client_profile).
All profile identifiers (email, phone, external ID, anonymous ID) are persisted to local storage
so that the SDK can keep track of the current profile.

Klaviyo SDK does not validate email address or phone number inputs locally, see
[documentation](https://help.klaviyo.com/hc/en-us/articles/360046055671-Accepted-phone-number-formats-for-SMS-in-Klaviyo)
on proper phone number formatting

Profile attributes can be set all at once:

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.setProfile({
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
});
```

or individually:

```typescript
import { KlaviyoProfilePropertyType, Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.setEmail('kermit@example.com');
Klaviyo.setPhone('+15555555555');
Klaviyo.setExternalId('12345');
Klaviyo.setProfileAttribute(KlaviyoProfilePropertyType.FIRST_NAME, 'Kermit');
```

If a user is logged out or you want to reset the profile for some reason use the following:

```typescript
import { KlaviyoProfileApi } from 'klaviyo-react-native-sdk';

KlaviyoProfileApi.resetProfile();
```

## Push Notifications

When setting up push notifications you will need to follow directions from the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#push-notifications) and [Android](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#push-notifications) SDKs.

## Deep Linking

Similarly for deep linking you will need to follow directions from the [iOS](https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#handling-deep-linking) and [Android](https://github.com/klaviyo/klaviyo-android-sdk?tab=readme-ov-file#deep-linking-in-push-notification) SDKs.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

```

```
