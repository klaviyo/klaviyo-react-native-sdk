# Troubleshooting Guide

## Android Troubleshooting

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

