// KlaviyoFormsReactNativeSdk.m
#import <React/RCTBridgeModule.h>
#if __has_include(<klaviyo_react_native_sdk/KlaviyoFormsReactNativeSdk-Bridging-Header.h>)
#import <klaviyo_react_native_sdk/KlaviyoFormsReactNativeSdk-Bridging-Header.h>
#else
#import "KlaviyoFormsReactNativeSdk-Bridging-Header.h"
#endif
#if __has_include(<klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>)
#import <klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>
#else
#import "klaviyo_react_native_sdk-Swift.h"
#endif

@implementation KlaviyoFormsReactNativeSdk
RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXPORT_METHOD(registerForInAppForms) {
    [KlaviyoFormsBridge registerForInAppForms];
}

@end
