#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>


@implementation AppDelegate

// Change to NO if you don't want debug alerts or logs.
BOOL isDebug = YES;


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"KlaviyoReactNativeSdkExample";
  self.initialProps = @{};
  
  // Installation Step 2: Set the UNUserNotificationCenter delegate to self
  [UNUserNotificationCenter currentNotificationCenter].delegate = self;

  // Installation Step 3: Initilize the SDK with public key. 
  [PushNotificationsHelper initializeSDK: @"YOUR_COMPANY_API_KEY_HERE"];
  
  // Installation Step 4: Request push permission from the user
  [PushNotificationsHelper requestPushPermission];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// Installation Step 6: Implement this delegate to receive and set the push token
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  // Installation Step 7: set the push token to Klaviyo SDK
  [PushNotificationsHelper setPushTokenWithToken:deviceToken];
  
  if (isDebug) {
      NSString *token = [self stringFromDeviceToken:deviceToken];
      NSLog(@"Device Token: %@", token);
  }
}

// Installation Step 8: [Optional] Implement this if registering with APNs fails
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  if (isDebug) {
    NSLog(@"Failed to register for remote notifications: %@", error);
  }
}

// Installation Step 9: Implement the delegate didReceiveNotificationResponse to response to user actions (tapping on push) push notifications
// when the app is in the background
// NOTE: this delegate will NOT be called if Installation Step 2 is not done.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)())completionHandler {
  // Installation Step 10: call `handleReceivingPushWithResponse` method and pass in the below arguments. Note that handleReceivingPushWithResponse calls our SDK and is
  // something that has to be implemented in your app as well.
  // furthur, if you want to intercept urls instead of them being routed to the system and system calling `application:openURL:options:` you can implement the `deepLinkHandler` below
  [PushNotificationsHelper handleReceivingPushWithResponse:response completionHandler:completionHandler deepLinkHandler:^(NSURL * _Nonnull url) {
    NSLog(@"URL is %@", url);
    [RCTLinkingManager application:UIApplication.sharedApplication openURL: url options: @{}];
  }];
  
  if (isDebug) {
    UIAlertController *alert = [UIAlertController
                                alertControllerWithTitle:@"Push Notification"
                                message:@"handled background notifications"
                                preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction 
                      actionWithTitle:@"OK"
                      style:UIAlertActionStyleDefault
                      handler:nil]];
    [self.window.rootViewController presentViewController:alert animated:YES completion:nil];
  }
}

// Installation Step 11: Implement the delegate willPresentNotification to handle push notifications when the app is in the foreground
// NOTE: this delegate will NOT be called if Installation Step 2 is not done.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler {
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
    [alert addAction:[UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:nil]];
    [self.window.rootViewController presentViewController:alert animated:YES completion:nil];
  }

  // Installation Step 12: call the completion handler with presentation options here, such as showing a banner or playing a sound.
  completionHandler(UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionBadge | UNNotificationPresentationOptionSound);
}

// Installation Step 13: Implement this method to receive deep link. There are some addition setup steps needed as mentioned in the readme here -
// https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#deep-linking
// Calling `RCTLinkingManager` is required for your react native listeners to be called
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [RCTLinkingManager application:app openURL:url options:options];
}

// Installation Step 13: Implement this method to receive deep link. There are some addition setup steps needed as mentioned in the readme here -
// https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#deep-linking
// additionally routing to the right screen in the app based on the url is also something that should be handled
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [PushNotificationsHelper handleDeepLinksWithUrl:url];
}


- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (NSString *)stringFromDeviceToken:(NSData *)deviceToken {
    const unsigned char *tokenBytes = (const unsigned char *)[deviceToken bytes];
    NSMutableString *token = [NSMutableString stringWithCapacity:([deviceToken length] * 2)];
    for (NSUInteger i = 0; i < [deviceToken length]; i++) {
        [token appendFormat:@"%02x", tokenBytes[i]];
    }
    return token;
}

@end
