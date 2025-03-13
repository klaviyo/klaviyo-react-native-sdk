// KlaviyoFormsReactNativeSdk.m
#import <React/RCTBridgeModule.h>
#import "KlaviyoFormsReactNativeSdk-Bridging-Header.h"
#import <klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>
// TODO: add __has_include(<klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>) conditional like KlaviyoReactNativeSdk.m

@implementation KlaviyoFormsReactNativeSdk
RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXPORT_METHOD(registerForInAppForms) {
    [KlaviyoFormsBridge registerForInAppForms];
}

@end
