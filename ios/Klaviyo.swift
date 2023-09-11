//
//  Klaviyo.swift
//  KlaviyoReactNative
//
//  Created by Ajay Subramanya on 9/7/23.
//

import Foundation
import KlaviyoSwift

@objc(Klaviyo)
class Klaviyo: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func initializeWithApiKey(_ value: String) {
    print("in initializeWithApiKey ###", value)
    KlaviyoSDK().initialize(with: value)
  }
  
  @objc
  func setEmail(_ value: String) {
    print("setting email = ", value)
    KlaviyoSDK().set(email: value)
  }
  
  @objc
  func setPhoneNumber(_ value: String) {
    print("setting phone number = ", value)
    KlaviyoSDK().set(phoneNumber: value)
  }
  
  @objc
  func requestPushPermission(
    _ value: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    print("requesting permissions for ", value)
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
        if let error = error {
          reject("AuthError", "error while trying to authorize push", error)
        } else {
          resolve(granted)
        }
    }
  }
  
  @objc
  func registerForRemoteNotifications() {
    print("in registering for remote notifications")
    DispatchQueue.main.async {
      UIApplication.shared.registerForRemoteNotifications()
//      let center = UNUserNotificationCenter.current()
//      center.delegate = self // Your SDK's delegate for notification handling
    }
  }
  
  @objc
  static func setToken(deviceToken: Data) {
    print("calling KlaviyoSDK().set(pushToken: deviceToken)", deviceToken)
    KlaviyoSDK().set(pushToken: deviceToken)
  }
}
