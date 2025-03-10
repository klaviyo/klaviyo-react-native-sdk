// KlaviyoFormsReactNativeSdk.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KlaviyoFormsBridge, NSObject)

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXTERN_METHOD(registerForInAppForms)

@end
