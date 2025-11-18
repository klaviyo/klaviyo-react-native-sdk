#import "KlaviyoReactNativeSdk.h"
#if __has_include(<klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>)
#import <klaviyo_react_native_sdk/klaviyo_react_native_sdk-Swift.h>
#else
#import "klaviyo_react_native_sdk-Swift.h"
#endif


@implementation KlaviyoReactNativeSdk
RCT_EXPORT_MODULE()

// this is required if we are using constantsToExport (read constantsToExport docs for more info)
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

// The values here eventually should come from the iOS SDK once exposed there.
- (NSDictionary *)constantsToExport {
    return @{
        @"PROFILE_KEYS": [KlaviyoBridge getProfilePropertyKeys],
        @"EVENT_NAMES": [KlaviyoBridge getEventTypesKeys],
    };
}

RCT_EXPORT_METHOD(initialize: (NSString *)apiKey)
{
    [KlaviyoBridge initialize: apiKey];
}

RCT_EXPORT_METHOD(setProfileAttribute: (NSString *)key value:(NSString *)value)
{
    [KlaviyoBridge setProfileAttribute:key value:value];
}

RCT_EXPORT_METHOD(setProfile: (NSDictionary *)profileDict)
{
    [KlaviyoBridge setProfile:profileDict];
}

RCT_EXPORT_METHOD(setExternalId: (NSString *)externalId)
{
    [KlaviyoBridge setExternalId: externalId];
}

RCT_EXPORT_METHOD(getExternalId: (RCTResponseSenderBlock)callback) {
    NSString *externalId = [KlaviyoBridge getExternalId];
    callback(@[externalId]);
}

RCT_EXPORT_METHOD(setEmail: (NSString *)email)
{
    [KlaviyoBridge setEmail: email];
}

RCT_EXPORT_METHOD(getEmail: (RCTResponseSenderBlock)callback) {
    NSString *email = [KlaviyoBridge getEmail];
    callback(@[email]);
}

RCT_EXPORT_METHOD(setPhoneNumber: (NSString *)phoneNumber)
{
    [KlaviyoBridge setPhoneNumber: phoneNumber];
}

RCT_EXPORT_METHOD(getPhoneNumber: (RCTResponseSenderBlock)callback) {
    NSString *phoneNumber = [KlaviyoBridge getPhoneNumber];
    callback(@[phoneNumber]);
}

RCT_EXPORT_METHOD(setPushToken: (NSString *)pushToken)
{
    [KlaviyoBridge setPushToken: pushToken];
}

RCT_EXPORT_METHOD(getPushToken: (RCTResponseSenderBlock)callback) {
    NSString *pushToken = [KlaviyoBridge getPushToken];
    callback(@[pushToken]);
}

RCT_EXPORT_METHOD(setBadgeCount: (nonnull NSNumber *)count)
{
    [KlaviyoBridge setBadgeCount: count.intValue];
}

RCT_EXPORT_METHOD(resetProfile)
{
    [KlaviyoBridge resetProfile];
}

RCT_EXPORT_METHOD(handleUniversalTrackingLink: (NSString *)trackingLinkString)
{
    if (trackingLinkString == nil || [trackingLinkString length] == 0) {
        NSLog(@"[Klaviyo] Error: Empty or nil tracking link provided");
        return;
    }
    
    NSURL *trackingLink = [NSURL URLWithString:trackingLinkString];
    if (trackingLink == nil) {
        NSLog(@"[Klaviyo] Error: Invalid tracking link format: %@", trackingLinkString);
        return;
    }
    
    [KlaviyoBridge handleUniversalTrackingLink:trackingLink];
}

RCT_EXPORT_METHOD(createEvent: (NSDictionary *) event)
{
    [KlaviyoBridge createEventWithEvent:event];
}

RCT_EXPORT_METHOD(registerForInAppForms: (NSDictionary *)configuration) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [KlaviyoBridge registerForInAppFormsWithConfiguration:configuration];
    });
}

RCT_EXPORT_METHOD(unregisterFromInAppForms) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [KlaviyoBridge unregisterFromInAppForms];
    });
}

RCT_EXPORT_METHOD(registerGeofencing) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [KlaviyoBridge registerGeofencing];
    });
}

RCT_EXPORT_METHOD(unregisterGeofencing) {
    [KlaviyoBridge unregisterGeofencing];
}

RCT_EXPORT_METHOD(getCurrentGeofences: (RCTResponseSenderBlock)callback) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [KlaviyoBridge getCurrentGeofencesWithCallback:^(NSDictionary *result) {
            callback(@[result]);
        }];
    });
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
