#import "KlaviyoReactNativeSdk.h"
#import <klaviyo_react_native_sdk-Swift.h>

@implementation KlaviyoReactNativeSdk
RCT_EXPORT_MODULE()

// this is required if we are using constantsToExport (read constantsToExport docs for more info)
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

// The values here eventually should come from the iOS SDK once exposed there.
- (NSDictionary *)constantsToExport {
    return @{
        @"PROFILE_KEYS": [KlaviyoBridge getProfilePropertyKey],
        @"EVENT_NAMES": [KlaviyoBridge getEventTypesKeys],
    };
}

//MARK: Setters

RCT_EXPORT_METHOD(initialize:(NSString *)publicToken)
{
    [KlaviyoBridge initializeSDK: publicToken];
}

RCT_EXPORT_METHOD(setEmail: (NSString *)email)
{
    [KlaviyoBridge setEmail: email];
}

RCT_EXPORT_METHOD(setPhoneNumber: (NSString *)phoneNumber)
{
    [KlaviyoBridge setPhoneNumber: phoneNumber];
}

RCT_EXPORT_METHOD(setExternalId: (NSString *)externalId)
{
    [KlaviyoBridge setExternalId: externalId];
}

RCT_EXPORT_METHOD(resetProfile)
{
    [KlaviyoBridge resetProfile];
}

RCT_EXPORT_METHOD(setProfile: (NSDictionary *)profileDict)
{
    [KlaviyoBridge setProfile:profileDict];
}


RCT_EXPORT_METHOD(createEvent: (NSDictionary *) event)
{
    [KlaviyoBridge createEventWithEvent:event];
}

//MARK: Getters

RCT_EXPORT_METHOD(getEmail: (RCTResponseSenderBlock)callback) {
    NSString *email = [KlaviyoBridge getEmail];
    callback(@[email]);
}
RCT_EXPORT_METHOD(getPhoneNumber: (RCTResponseSenderBlock)callback) {
    NSString *phoneNumber = [KlaviyoBridge getPhoneNumber];
    callback(@[phoneNumber]);
}
RCT_EXPORT_METHOD(getExternalId: (RCTResponseSenderBlock)callback) {
    NSString *externalId = [KlaviyoBridge getExternalId];
    callback(@[externalId]);
}
RCT_EXPORT_METHOD(getPushToken: (RCTResponseSenderBlock)callback) {
    NSString *pushToken = [KlaviyoBridge getPushToken];
    callback(@[pushToken]);
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
