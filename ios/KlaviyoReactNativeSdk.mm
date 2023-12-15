#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KlaviyoReactNativeSdk, NSObject)

RCT_EXTERN_METHOD(multiply:(float)a withB:(float)b
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createEvent:(NSDictionary)event)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
