#import "KlaviyoReactNativeSdk.h"
#import <klaviyo_react_native_sdk-Swift.h>

@implementation KlaviyoReactNativeSdk
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(createEvent:(NSDictionary *)event)
{
    NSLog(@"createEvent: %@", event);
    [KlaviyoBridge createEventWithEvent: event];
}

// Don't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeKlaviyoReactNativeSdkSpecJSI>(params);
}
#endif

@end
