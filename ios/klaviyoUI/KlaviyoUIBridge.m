// KlaviyoUIBridge.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KlaviyoUIBridge, NSObject)

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

@end
