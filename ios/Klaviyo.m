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
RCT_EXTERN_METHOD(requestPushPermission:(NSArray<NSString *> *)value
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(registerForRemoteNotifications)
@end
