
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNKlaviyoReactNativeSdkSpec.h"

@interface KlaviyoReactNativeSdk : NSObject <NativeKlaviyoReactNativeSdkSpec>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTInvalidating.h>

@interface KlaviyoReactNativeSdk : NSObject <RCTBridgeModule, RCTInvalidating>
#endif

@end
