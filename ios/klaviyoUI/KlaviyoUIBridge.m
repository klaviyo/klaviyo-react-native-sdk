// KlaviyoUIBridge.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KlaviyoUIBridge, NSObject)

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXTERN_METHOD(helloWorld)

@end
