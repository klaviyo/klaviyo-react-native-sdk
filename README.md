# klaviyo-react-native-sdk

⚠️ This repository is in beta development ⚠️

The Klaviyo React Native SDK allows developers to incorporate Klaviyo analytics and push notification functionality in
their React Native applications for Android and iOS. It is a Typescript wrapper (native module bridge) around the native
Klaviyo iOS and Android SDKs. For more information on the native SDKs, please see the
[iOS](https://github.com/klaviyo/klaviyo-swift-sdk) and [Android](https://github.com/klaviyo/klaviyo-android-sdk)
repositories. The SDK assists in identifying users and tracking user events via the latest Klaviyo Client APIs.
To reduce performance overhead, API requests are queued and sent in batches. The queue is persisted to local storage
so that data is not lost if the device is offline or the app is terminated.

Once integrated, your marketing team will be able to better understand your app users' needs and send them timely
push notifications via FCM (Firebase Cloud Messaging) and APNs (Apple Push Notification Service).

## Requirements
For initial beta release, the SDK was developed and tested against the latest minor release of React Native (0.73).
We are actively testing and expanding support to the latest patch releases of recent minor versions of React Native.
Our current compatibility matrix is as follows:

| React Native Version | Android | iOS |
|----------------------|---------|-----|
| >= 0.73.1            | ✅       | ✅   |
| 0.72.10              | ⚠️      | ✅   |
| 0.71.15              | ⚠️      | ✅   |
| 0.68.7 - 0.70.15     | ✅       | ✅   |
| <= 0.67.x            | ❔       | ❔   |

- ✅ Fully supported and tested
- ⚠️ Supported with modifications to config files, see installation notes
- ❌ Not yet supported due to installation issues

### Android
- `minSdkVersion` of `24+` - We are investigating a React Native issue in order to bring this down to 23+,
  for consistency with the Klaviyo Android SDK.
- `compileSdkVersion` of `34+`
- `kotlinVersion` of `1.8.0+`

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

### Android
Android installation requirements may vary depending upon your project configuration and other dependencies.
The Klaviyo React Native SDK's `build.gradle` file exposes transitive dependencies upon the Klaviyo Android SDK,
so you can import Android Klaviyo SDK references from your Kotlin/Java files without modifying your gradle configuration.

#### React Native 0.73.x
There are no additional installation requirements. Android support is fully tested and verified,
including `minSdkVersion=23`.

#### React Native 0.71.x - 0.72.x
We have successfully tested the Klaviyo React Native SDK in a bare React Native template app for these versions
with the following modifications to the `android/build.gradle` file:
- Set `compileSdkVersion=34`, if you have not already.
- Set `minSdkVersion=24` in `android/build.gradle`.
  We are actively working to address this inconsistency with the Klaviyo Android SDK, which supports API 23+.
- Set `kotlinVersion` to at least `1.8.0`, the Klaviyo Android SDK is developed in Kotlin `1.9.22`

#### React Native <= 0.70.x
We are actively working to resolve a gradle dependency issue related to the 0.71.0 React Native outage.

#### Android Troubleshooting
- If you have set the proper `kotlinVersion`, yet still see errors related to kotlin version,
  try adding `kotlin_version=kotlinVersion`. In some cases, it appears that setting the `kotlinVersion` variable is
  not enough, perhaps due to some inconsistency in variable formatting within React Native build files.

### iOS
After installing the npm package, run the following command in the `ios` directory of your React Native project.
Install [Cocoapods](https://cocoapods.org/) if you have not already.
```sh
pod install --repo-update
```

#### iOS Troubleshooting
If you are seeing issues related to `minimum deployment target` when installing pods, you may need to update your
minimum iOS version to 13.0 in your Podfile with one of the following strategies.
- Specify iOS version directly in the `Podfile`:
  ```ruby
  MIN_IOS_OVERRIDE = '13.0'
  if Gem::Version.new(MIN_IOS_OVERRIDE) > Gem::Version.new(min_ios_version_supported)
      min_ios_version_supported = MIN_IOS_OVERRIDE
  end
  # existing code
  platform :ios, min_ios_version_supported
  ```
- Set the deployment target to 13.0 in XCode, and then pull `IPHONEOS_DEPLOYMENT_TARGET` from the XCode project:
  ```ruby
  #######
  # Read min iOS version from Xcode project and set as min iOS version for Podfile
  require 'xcodeproj'

  project_path = './YOUR_XCODE_PROJECT.xcodeproj'
  project = Xcodeproj::Project.open(project_path)
  min_ios_version_supported = project.build_configurations.first.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
  ######

  platform :ios, min_ios_version_supported
  ```

## Initialization
The SDK must be initialized with the short alphanumeric
[public API key](https://help.klaviyo.com/hc/en-us/articles/115005062267#difference-between-public-and-private-api-keys1)
for your Klaviyo account, also known as your Site ID. Initialization is done in the native layer, and must occur before
any other SDK methods can be invoked. Follow the native SDK instructions for initialization:
- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Initialization)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#event-tracking)

[//]: # (TODO - change swift-sdk link to #Initialization)

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

Either way, the native SDKs will group and batch API calls to improve performance.

### Reset Profile
To start a _new_ profile altogether (e.g. if a user logs out), either call `Klaviyo.resetProfile()`
to clear the currently tracked profile identifiers (e.g. on logout), or use `Klaviyo.setProfile(profile)`
to overwrite it with a new profile object.

```typescript
import { Klaviyo } from 'klaviyo-react-native-sdk';

Klaviyo.resetProfile();
```

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
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Push-Notifications

[//]: # (TODO - change swift-sdk link to #Setup)

### Collecting Push Tokens
Push tokens must be collected in the native layer. Follow the platform-specific instructions below:
- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Collecting-Push-Tokens)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#sending-push-notifications)

[//]: # (TODO - change swift-sdk link to #Collecting-Push-Tokens)

#### Notification Permission
Requesting user permission to display notifications can be managed in the native layer as instructed in our native SDK
documentation, or with a third party library that provides cross-platform permissions APIs. If you opt for a
cross-platform permission solution, you will still need to provide the Klaviyo SDK with the push token from the
native layer after a permission change.

### Receiving Push Notifications
You can send test notifications to a specific token using the
[push notification preview](https://help.klaviyo.com/hc/en-us/articles/18011985278875)
feature in order to test your integration.

#### Rich Push
[Rich Push](https://help.klaviyo.com/hc/en-us/articles/16917302437275) is the ability to add images to
push notification messages. On iOS, you will need to implement an extension service to attach images to notifications.
No additional setup is needed to support rich push on Android.
- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Rich-Push)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#rich-push-notifications)

[//]: # (TODO - change swift-sdk link to #Rich-Push)

#### Tracking Open Events
Klaviyo tracks push opens events with a specially formatted event `Opened Push` that includes message tracking
parameters in the event properties. To track push opens, you will need to follow platform-specific instructions:
- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Tracking-Open-Events)
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#tracking-push-notifications)

[//]: # (TODO - change swift-sdk link to #Tracking-Open-Events)

#### Tracking Open Events
To track push notification opens, you must call `Klaviyo.handlePush(intent)` when your app is launched from an intent.
This method will check if the app was opened from a notification originating from Klaviyo and if so, create an
`Opened Push` event with required message tracking parameters. For example:

#### Deep Linking
[Deep Links](https://help.klaviyo.com/hc/en-us/articles/14750403974043) allow you to navigate to a particular
page within your app in response to the user opening a notification. Familiarize yourself with the
[React Native Guide](https://reactnative.dev/docs/linking) to deep linking, then read through the platform-specific
instructions below.
- [Android](https://github.com/klaviyo/klaviyo-android-sdk#Deep-Linking) instructions for handling intent filters
- [iOS](https://github.com/klaviyo/klaviyo-swift-sdk#Deep-Linking)
  As shown in the native SDK documentation, you can follow option 1 or 2.
  With option 1, when you get the callback, you can handle it as follows:

  ```objective-c
  [RCTLinkingManager application:application openURL:url options:options]
  ```

  Since you won't have `options`, you can just pass in an empty dictionary for that parameter.

  With option 2, when you handle the open url (in [`application(_:open:options)`](https://developer.apple.com/documentation/uikit/uiapplicationdelegate/1623112-application)),
  you call the linking code block above similar to what you would do with option 1.

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

## Contributing
Refer to the [contributing guide](.github/CONTRIBUTING.md) to learn how to contribute to the Klaviyo React Native SDK.
We welcome your feedback in the [discussion](https://github.com/klaviyo/klaviyo-react-native-sdk/discussions)
and [issues](https://github.com/klaviyo/klaviyo-react-native-sdk/issues) sections of our public GitHub repository.

## License
The Klaviyo React Native SDK is available under the terms of the MIT license. See [LICENSE](./LICENSE) for more info.

## Code Documentation
Browse complete autogenerated code documentation [here](https://klaviyo.github.io/klaviyo-react-native-sdk/).
