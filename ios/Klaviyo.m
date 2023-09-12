//
//  Klaviyo.m
//  KlaviyoReactNative
//
//  Created by Ajay Subramanya on 9/7/23.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(Klaviyo, NSObject)
RCT_EXTERN_METHOD(initializeWithApiKey: (NSString *)value)
RCT_EXTERN_METHOD(setEmail: (NSString *)value)
RCT_EXTERN_METHOD(setPhoneNumber: (NSString *)value)
RCT_EXTERN_METHOD(setExternalId: (NSString *)value)
RCT_EXTERN_METHOD(requestPushPermission:(NSArray<NSString *> *)value
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(registerForRemoteNotifications)
RCT_EXTERN_METHOD(setProfile: (NSString *)email
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
                  properties: (NSDictionary * )properties
)

RCT_EXTERN_METHOD(resetProfile)

@end




