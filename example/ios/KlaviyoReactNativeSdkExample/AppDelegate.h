#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>
#import <UserNotifications/UserNotifications.h>
#import "KlaviyoReactNativeSdkExample-Swift.h"
#if __has_include(<klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>)
#import <klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>
#else
#import "klaviyo_react_native_sdk-Swift.h"
#endif

// iOS Installation Step 1: Conform AppDelegate to UNUserNotificationCenterDelegate
@interface AppDelegate: RCTAppDelegate <UNUserNotificationCenterDelegate>

@end
