
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNKlaviyoReactNativeSdkSpec.h"

@interface KlaviyoReactNativeSdk : NSObject <NativeKlaviyoReactNativeSdkSpec>
#else
#import <React/RCTBridgeModule.h>

@interface KlaviyoReactNativeSdk : NSObject <RCTBridgeModule>
#endif

@end
