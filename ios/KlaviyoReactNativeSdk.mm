#import "KlaviyoReactNativeSdk.h"
#import <klaviyo_react_native_sdk-Swift.h>

@implementation KlaviyoReactNativeSdk
RCT_EXPORT_MODULE()

// this is required if we are using constantsToExport (read constantsToExport docs for more info)
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSDictionary *)constantsToExport {
    // TODO: below is just hardcoded example need to figure out how to get this out of the iOS SDK since it's not exposed
    return @{
        @"PROFILE_KEYS": @{
            @"EXTERNAL_ID": @"external_id",
            @"EMAIL": @"email",
            @"PHONE_NUMBER": @"phone_number",
            @"FIRST_NAME": @"first_name",
            @"LAST_NAME": @"last_name",
            @"ORGANIZATION": @"organization",
            @"TITLE": @"title",
            @"IMAGE": @"image",
            @"ADDRESS1": @"address1",
            @"ADDRESS2": @"address2",
            @"CITY": @"city",
            @"COUNTRY": @"country",
            @"LATITUDE": @"latitude",
            @"LONGITUDE": @"longitude",
            @"REGION": @"region",
            @"ZIP": @"zip",
            @"TIMEZONE": @"timezone"
        },
        @"EVENT_NAMES": @"",
        @"EVENT_KEYS": @""
    };
}

//MARK: Setters

RCT_EXPORT_METHOD(initialize:(NSString *)publicToken)
{
    [KlaviyoBridge initializeSDK: publicToken];
}

RCT_EXPORT_METHOD(createEvent:(NSDictionary *)event)
{
    [KlaviyoBridge createEventWithEvent: event];
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

RCT_EXPORT_METHOD(setProfile: (NSString *)email
                  phoneNumber: (NSString *)phoneNumber
                  externalId: (NSString *)externalId
                  firstName: (NSString *)firstName
                  lastName: (NSString *)lastName
                  organization: (NSString *)organization
                  title: (NSString *)title
                  image: (NSString *)image
                  address1: (NSString *)address1
                  address2: (NSString *)address2
                  city: (NSString *)city
                  country: (NSString *)country
                  latitude: (nonnull NSNumber *)latitude
                  longitude: (nonnull NSNumber *)longitude
                  region: (NSString *)region
                  zip: (NSString *)zip
                  timezone: (NSString *)timezone
                  properties: (NSDictionary * )properties)
{
    NSLog(@"in set profile");
    [KlaviyoBridge setProfile: email
                   phoneNumber: phoneNumber
                   externalId: externalId
                   firstName: firstName
                   lastName: lastName
                   organization: organization
                   title: title
                   image: image
                   address1: address1
                   address2: address2
                   city: city
                   country: country
                   latitude: latitude
                   longitude: longitude
                   region: region
                   zip: zip
                   timezone: timezone
                   properties: properties];
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
