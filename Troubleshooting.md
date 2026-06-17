# Troubleshooting Guide

## Android Troubleshooting

### Push notifications not displaying when another push SDK is installed

On Android, Klaviyo receives push through a `FirebaseMessagingService` (`KlaviyoPushService`) registered for the
`com.google.firebase.MESSAGING_EVENT` intent. Android delivers each FCM message to only one such service. If your
app also includes another library that registers its own `FirebaseMessagingService` — for example
[`@react-native-firebase/messaging`](https://www.npmjs.com/package/@react-native-firebase/messaging) or another
third-party push SDK — only one of those services will receive a given message; the other is not invoked, so its
notifications silently do not display (no error is logged). If Klaviyo notifications do not appear while another
push library is installed, this is the likely cause.

The Klaviyo SDK declares `KlaviyoPushService` from its own module so that it takes precedence in most setups, but
that is not guaranteed — which service takes precedence is determined at build time by Android manifest merge order,
which among libraries follows React Native autolinking order. Use whichever option fits your app — options 1 and 2
make Klaviyo's service take precedence (option 1 is the most reliable), while option 3 lets both SDKs receive their
own messages:

1. **Declare `KlaviyoPushService` in your app's `AndroidManifest.xml`.** A declaration in your app's own manifest
   always takes precedence over one contributed by a library, regardless of dependency order. This is the most
   reliable option, and is what the [Klaviyo Expo plugin](https://github.com/klaviyo/klaviyo-expo-plugin) does
   automatically:

   ```xml
   <!-- android/app/src/main/AndroidManifest.xml, inside the <application> element -->
   <service
       android:name="com.klaviyo.pushFcm.KlaviyoPushService"
       android:exported="false">
       <intent-filter>
           <action android:name="com.google.firebase.MESSAGING_EVENT" />
       </intent-filter>
   </service>
   ```

2. **List `klaviyo-react-native-sdk` before the other push library in your `package.json` `dependencies`.**
   React Native autolinking preserves dependency order, so listing Klaviyo first registers its service ahead of the
   other library's. This is lighter-weight but more fragile — tooling that alphabetizes `package.json` can undo it —
   so prefer option 1 if you need a reliable result.

3. **Implement a custom `FirebaseMessagingService` that routes to each SDK.** If you need _both_ Klaviyo and
   another push SDK to receive their own messages (rather than one simply taking precedence), register a single
   service in your app and route each `RemoteMessage` to the appropriate SDK (use `RemoteMessage.isKlaviyoMessage`
   to identify Klaviyo messages). See the Android SDK's
   [Advanced Setup](https://github.com/klaviyo/klaviyo-android-sdk#advanced-setup) for how to subclass or delegate
   to `KlaviyoPushService`.

### `minSdkVersion` Issues

We have seen projects, particularly on react-native versions `0.72.x` and `0.71.x`, that required a `minSdkVersion`
of `24`, despite the Klaviyo Android SDK supporting API 23+. If you encounter this, please file an issue in our
repository and provide version numbers of your react-native dependencies.

## iOS Troubleshooting

### CocoaPods Installation Issues

1. If you are seeing issues related to `minimum deployment target` when installing pods, you may need to update your
   minimum iOS version to 13.0 in your Podfile with one of the following strategies:
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

2. If the command `pod install` is outputting version mismatch errors for `KlaviyoSwift`, please
   run `pod update KlaviyoSwift` as indicated in the error message to update your local pods spec repo.

### `UNUserNotificationCenter` delegate methods not being called

If you are not seeing the delegate methods for `UNUserNotificationCenter` being called in `AppDelegate`,
there are two possible reasons for this:

1. [Notifee](https://notifee.app/) intercepts the AppDelegate delegate methods and hence you may not receive
   the delegate calls if notifee is included in the iOS project. The solution is to remove notifee dependency
   from your project or exclude it for iOS.
2. Firebase iOS SDK also swizzles AppDelegate methods when configured on your iOS app. If after disabling notifee,
   if the delegates are still not called, this may be the reason. Method swizzling can be turned off by following
   [Firebase's documentation](https://firebase.google.com/docs/cloud-messaging/ios/client).

### Deep links in push notifications not getting sent over to React Native layer when the iOS app is terminated

When the iOS app is terminated (killed from the app switcher by swiping up), there is a bug in React Native that
prevents the native layer from calling the listeners set up in React Native to listen to incoming deep links.
The listener in question here is `Linking.getInitialURL()` which is expected to be called when a deep link is
available while the app is terminated.

You can find the open issue describing this problem on React Native's GitHub repository [Here](https://github.com/facebook/react-native/issues/32350).
There are many workarounds suggested in this issue's thread and a few other similar issues.
However, the workaround that worked for us involves intercepting the launch arguments in the app delegate and adding
a key `UIApplicationLaunchOptionsURLKey`, which React Native expects to be present when calling the `Linking.getInitialURL()` listener.

Here's a method to implement this workaround:

```swift
- (NSMutableDictionary *)getLaunchOptionsWithURL:(NSDictionary * _Nullable)launchOptions {
  NSMutableDictionary *launchOptionsWithURL = [NSMutableDictionary dictionaryWithDictionary:launchOptions];
  if (launchOptions[UIApplicationLaunchOptionsRemoteNotificationKey]) {
    NSDictionary *remoteNotification = launchOptions[UIApplicationLaunchOptionsRemoteNotificationKey];

    if (remoteNotification[@"url"]) {
      NSString *initialURL = remoteNotification[@"url"];
      if (!launchOptions[UIApplicationLaunchOptionsURLKey]) {
        launchOptionsWithURL[UIApplicationLaunchOptionsURLKey] = [NSURL URLWithString:initialURL];
      }
    }
  }
  return launchOptionsWithURL;
}
```

Ensure that this method is called from `application:didFinishLaunchingWithOptions:` before calling the superclass method with the
modified launch arguments, like so:

```swift
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"KlaviyoReactNativeSdkExample";
  self.initialProps = @{};

  // some more code ...

  NSMutableDictionary * launchOptionsWithURL = [self getLaunchOptionsWithURL:launchOptions];

  return [super application:application didFinishLaunchingWithOptions:launchOptionsWithURL];
}

```

This implementation is included in the example app in this repo and can be used for testing.
Make sure to use the URL scheme (rntest://) of the example app when testing.

### iOS APNS Token Troubleshooting

There is an open issue with [`@react-native-firebase/messaging`](https://github.com/invertase/react-native-firebase/issues/8022) where the SDK will uppercase any APNS token returned using `messaging().getAPNSToken()`.
You can verify this by adding a log the `AppDelegate.m` file that prints the deviceToken (you will need to convert to a hex string).
This might have no impact on your use case, but is something to consider when designing.

### iOS Geofencing Events not Firing

The delivery of geofence events to the Klaviyo SDK requires registering for geofences in the native iOS layer in `didFinishLaunchingWithOptions`. If you only call `Klaviyo.registerGeofencing()` in the React Native layer or any later in the lifecycle, triggered enter/exit events may not get delivered in a reliable manner as the native monitoring service relies on that AppDelegate entry point.
