#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

@implementation AppDelegate

// Change to NO if you don't want debug alerts or logs.
BOOL isDebug = YES;

// Change to NO if you prefer to initialize and handle push tokens in the React
// Native layer
BOOL useNativeImplementation = YES;

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  self.moduleName = @"KlaviyoReactNativeSdkExample";
  self.initialProps = @{};

  // iOS Installation Step 2: Set the UNUserNotificationCenter delegate to self
  [UNUserNotificationCenter currentNotificationCenter].delegate = self;

  if (useNativeImplementation) {
    // iOS Installation Step 3: Initialize the SDK with public key, if
    // initializing from native code Exclude if initializing from react native
    // layer
    [PushNotificationsHelper initializeSDK:@"YOUR_KLAVIYO_PUBLIC_API_KEY"];

    // iOS Installation Step 4: Request notification permission from the user
    // Exclude if handling permissions from react native layer
    [PushNotificationsHelper requestNotificationPermission];
  } else {
    // Initialize cross-platform push library, e.g. Firebase
  }

  // Start monitoring geofences from background
  dispatch_async(dispatch_get_main_queue(), ^{
    [KlaviyoBridge registerGeofencing];
  });

  // refer to installation step 16 below
  NSMutableDictionary *launchOptionsWithURL =
      [self getLaunchOptionsWithURL:launchOptions];

  return [super application:application
      didFinishLaunchingWithOptions:launchOptionsWithURL];
}

// iOS Installation Step 6: Implement this delegate to receive and set the push
// token
- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  if (useNativeImplementation) {
    // iOS Installation Step 7: set the push token to Klaviyo SDK
    // Exclude if handling push tokens from react native layer
    [PushNotificationsHelper setPushTokenWithToken:deviceToken];
  } else {
    // Provide token to cross-platform push library, e.g. firebase
  }

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
