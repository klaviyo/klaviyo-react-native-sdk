
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNKlaviyoReactNativeSdkSpec.h"

@interface KlaviyoReactNativeSdk : RCTEventEmitter <NativeKlaviyoReactNativeSdkSpec>
#else

@interface KlaviyoReactNativeSdk : RCTEventEmitter <RCTBridgeModule>
#endif

@end
