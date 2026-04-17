#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

#import <FirebaseCore/FirebaseCore.h>

// For native-only push integration (no @react-native-firebase/messaging),
// see the Klaviyo Swift SDK README for guidance:
// https://github.com/klaviyo/klaviyo-swift-sdk#push-notifications

@implementation AppDelegate

// Change to NO if you don't want debug alerts or logs.
BOOL isDebug = YES;

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  self.moduleName = @"KlaviyoReactNativeSdkExample";
  self.initialProps = @{};

  // iOS Installation Step 2: Set the UNUserNotificationCenter delegate to self
  [UNUserNotificationCenter currentNotificationCenter].delegate = self;

  // Initialize Firebase. See example/README.md for GoogleService-Info.plist
  // setup (real config for push, or a stub to let the build/launch succeed
  // without wiring up a Firebase project).
  [FIRApp configure];

  // APNs registration is driven from JS via messaging().requestPermission(),
  // which calls registerForRemoteNotifications() under the hood and produces
  // the APNs token. Note: APNs registration is independent of the user's
  // notification permission — the token is delivered as soon as the device
  // completes the APNs handshake with network connectivity, regardless of
  // whether the user has allowed notifications to be displayed. We trigger
  // the request from the "Request Push Permission" button in the UI instead
  // of here so the flow is user-driven and observable in the demo.

  // OPTIONAL: Native initialization approach (uncomment if you prefer to initialize from Swift)
  // See README.md for details on when you might want this.
  // [PushNotificationsHelper initializeSDK:@"YOUR_KLAVIYO_PUBLIC_API_KEY"];
  // [PushNotificationsHelper requestNotificationPermission];

  // Geofencing registration is JS-driven in this example — see
  // example/src/hooks/useLocation.ts, which calls Klaviyo.registerGeofencing()
  // after the user grants location permission. Calling it from AppDelegate is
  // the "earliest possible" option but not required; the Swift SDK's
  // registerGeofencing() is safe to invoke from JS once RN init completes.

  // refer to installation step 16 below
  NSMutableDictionary *launchOptionsWithURL =
      [self getLaunchOptionsWithURL:launchOptions];

  return [super application:application
      didFinishLaunchingWithOptions:launchOptionsWithURL];
}

// iOS Installation Step 6: Implement this delegate to receive and log the
// APNs push token. Firebase's default method swizzling (enabled by default
// when FirebaseAppDelegateProxyEnabled is absent from Info.plist) handles
// forwarding this callback to FIRMessaging and to RNFB's internal registration
// waiter — the app just needs to implement this method so the selector is in
// the dispatch table for swizzling to find.
- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  // OPTIONAL: Native push token handling (uncomment if not using Firebase).
  // See the Klaviyo Swift SDK README for the full native integration path:
  // https://github.com/klaviyo/klaviyo-swift-sdk#push-notifications
  // [PushNotificationsHelper setPushTokenWithToken:deviceToken];

  if (isDebug) {
    NSString *token = [self stringFromDeviceToken:deviceToken];
    NSLog(@"Device Token: %@", token);
  }
}

// iOS Installation Step 8: [Optional] Implement this if registering with APNs
// fails
- (void)application:(UIApplication *)application
    didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  if (isDebug) {
    NSLog(@"Failed to register for remote notifications: %@", error);
  }
}

// iOS Installation Step 9: Implement the delegate
// didReceiveNotificationResponse to response to user actions (tapping on push)
// push notifications when the app is in the background NOTE: this delegate will
// NOT be called if iOS Installation Step 2 is not done.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
    didReceiveNotificationResponse:(UNNotificationResponse *)response
             withCompletionHandler:(void (^)())completionHandler {
  // iOS Installation Step 10: call `handleReceivingPushWithResponse` method and
  // pass in the below arguments. Note that handleReceivingPushWithResponse
  // calls our SDK and is something that has to be implemented in your app as
  // well. Further, if you want to intercept urls instead of them being routed
  // to the system and system calling `application:openURL:options:` you can
  // implement the `deepLinkHandler` below
  [PushNotificationsHelper
      handleReceivingPushWithResponse:response
                    completionHandler:completionHandler
                      deepLinkHandler:^(NSURL *_Nonnull url) {
                        NSLog(@"URL is %@", url);
                        [RCTLinkingManager
                            application:UIApplication.sharedApplication
                                openURL:url
                                options:@{}];
                      }];

  // iOS Installation Step 9a: update the app count to current badge number - 1.
  // You can also set this to 0 if you no longer want the badge to show.
  [PushNotificationsHelper updateBadgeCount:[UIApplication sharedApplication]
                                                .applicationIconBadgeNumber -
                                            1];

  if (isDebug) {
    UIAlertController *alert = [UIAlertController
        alertControllerWithTitle:@"Push Notification"
                         message:@"handled background notifications"
                  preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"OK"
                                              style:UIAlertActionStyleDefault
                                            handler:nil]];
    [self.window.rootViewController presentViewController:alert
                                                 animated:YES
                                               completion:nil];
  }
}

// iOS Installation Step 11: Implement the delegate willPresentNotification to
// handle push notifications when the app is in the foreground NOTE: this
// delegate will NOT be called if iOS Installation Step 2 is not done.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:
             (void (^)(UNNotificationPresentationOptions options))
                 completionHandler {
  if (isDebug) {
    NSDictionary *userInfo = notification.request.content.userInfo;
    // Handle the push notification payload as needed
    NSLog(@"Received Push Notification: %@", userInfo);
    // Example: Display an alert with the notification message
    NSString *message = userInfo[@"aps"][@"alert"][@"body"];
    UIAlertController *alert = [UIAlertController
        alertControllerWithTitle:@"Push Notification"
                         message:message
                  preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"OK"
                                              style:UIAlertActionStyleDefault
                                            handler:nil]];
    [self.window.rootViewController presentViewController:alert
                                                 animated:YES
                                               completion:nil];
  }

  // iOS Installation Step 12: call the completion handler with presentation
  // options here, such as showing a banner or playing a sound.
  completionHandler(UNNotificationPresentationOptionAlert |
                    UNNotificationPresentationOptionBadge |
                    UNNotificationPresentationOptionSound);
}

// iOS Installation Step 13: Implement this method to receive deep link. There
// are some addition setup steps needed as mentioned in the readme here -
// https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#deep-linking
// Calling `RCTLinkingManager` is required for your react native listeners to be
// called
- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:
                (NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  return [RCTLinkingManager application:app openURL:url options:options];
}

// iOS Installation Step 13a: Implement this method to handle Universal Links
// (https://) This is required for Klaviyo universal tracking links and other
// HTTPS deep links Calling `RCTLinkingManager` forwards the universal link to
// your React Native code
- (BOOL)application:(UIApplication *)application
    continueUserActivity:(NSUserActivity *)userActivity
      restorationHandler:
          (void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))
              restorationHandler {
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

// iOS Installation Step 14: if you want to reset the app badge count whenever
// the app becomes active implement this delegate method and set the badge count
// to 0. Note that this may sometimes mean that the user would miss the
// notification.
- (void)applicationDidBecomeActive:(UIApplication *)application {
  [PushNotificationsHelper updateBadgeCount:0];
}

// iOS Installation Step 15: Handle silent push notifications (content-available: 1).
// This method fires for both pure silent pushes and standard pushes that carry
// content-available. Only forward pure silent pushes (no aps.alert) for background
// processing — standard pushes are handled by willPresent/didReceive.
- (void)application:(UIApplication *)application
    didReceiveRemoteNotification:(NSDictionary *)userInfo
          fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {
  NSDictionary *apsPayload = userInfo[@"aps"];
  BOOL hasVisibleContent = apsPayload[@"alert"] != nil;

  if (!hasVisibleContent) {
    [PushNotificationsHelper handleSilentPushWithUserInfo:userInfo];

    if (isDebug) {
      NSString *payload = [NSString stringWithFormat:@"%@", userInfo];
      UIAlertController *alert = [UIAlertController
          alertControllerWithTitle:@"Silent Push Received"
                           message:payload
                    preferredStyle:UIAlertControllerStyleAlert];
      [alert addAction:[UIAlertAction actionWithTitle:@"OK"
                                                style:UIAlertActionStyleDefault
                                              handler:nil]];
      [self.window.rootViewController presentViewController:alert
                                                   animated:YES
                                                 completion:nil];
    }
  } else if (apsPayload[@"content-available"]) {
    if (isDebug) {
      NSLog(@"Standard Push with Background Processing: %@", userInfo);
    }
  }

  // You MUST call the completion handler within ~30 seconds.
  // Failing to do so will cause iOS to throttle or stop delivering
  // silent push notifications to your app.
  completionHandler(UIBackgroundFetchResultNewData);
}

// iOS Installation Step 16: call this method from
// `application:didFinishLaunchingWithOptions:` before calling the super class
// method with the launch arguments. This is a workaround for a react issue
// where if the app is terminated the deep link isn't sent to the react native
// layer when it is coming from a remote notification.
// https://github.com/facebook/react-native/issues/32350
- (NSMutableDictionary *)getLaunchOptionsWithURL:
    (NSDictionary *_Nullable)launchOptions {
  NSMutableDictionary *launchOptionsWithURL =
      [NSMutableDictionary dictionaryWithDictionary:launchOptions];
  if (launchOptions[UIApplicationLaunchOptionsRemoteNotificationKey]) {
    NSDictionary *remoteNotification =
        launchOptions[UIApplicationLaunchOptionsRemoteNotificationKey];

    if (remoteNotification[@"url"]) {
      NSString *initialURL = remoteNotification[@"url"];
      if (!launchOptions[UIApplicationLaunchOptionsURLKey]) {
        launchOptionsWithURL[UIApplicationLaunchOptionsURLKey] =
            [NSURL URLWithString:initialURL];
      }
    }
  }
  return launchOptionsWithURL;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  return [self bundleURL];
}

- (NSURL *)bundleURL {
#if DEBUG
  return
      [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main"
                                 withExtension:@"jsbundle"];
#endif
}

- (NSString *)stringFromDeviceToken:(NSData *)deviceToken {
  const unsigned char *tokenBytes = (const unsigned char *)[deviceToken bytes];
  NSMutableString *token =
      [NSMutableString stringWithCapacity:([deviceToken length] * 2)];
  for (NSUInteger i = 0; i < [deviceToken length]; i++) {
    [token appendFormat:@"%02x", tokenBytes[i]];
  }
  return token;
}

@end
