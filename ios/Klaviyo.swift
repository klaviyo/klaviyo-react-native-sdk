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
  
  // MARK: Setters
  
  @objc
  func initializeWithApiKey(_ value: String) {
    print("in initializeWithApiKey ###", value)
    KlaviyoSDK().initialize(with: value)
  }
  
  @objc
  static func setToken(deviceToken: Data) {
    print("calling KlaviyoSDK().set(pushToken: deviceToken)", deviceToken)
    KlaviyoSDK().set(pushToken: deviceToken)
  }
  
  @objc
  func setProfile(
    _ email: String? = nil,
    phoneNumber: String? = nil,
    externalId: String? = nil,
    firstName: String? = nil,
    lastName: String? = nil,
    organization: String? = nil,
    title: String? = nil,
    image: String? = nil,
    address1: String? = nil,
    address2: String? = nil,
    city: String? = nil,
    country: String? = nil,
    latitude: NSNumber? = nil,
    longitude: NSNumber? = nil,
    region: String? = nil,
    zip: String? = nil,
    timezone: String? = nil,
    properties: NSDictionary? = nil
  ) {
    let location = Profile.Location(
      address1: address1,
      address2: address2,
      city: city,
      country: country,
      latitude: latitude as? Double,
      longitude: longitude as? Double,
      region: region,
      zip: zip,
      timezone: timezone
    )

    let profile = Profile(
      email: email,
      phoneNumber: phoneNumber,
      externalId: externalId,
      firstName: firstName,
      lastName: lastName,
      organization: organization,
      title: title,
      image: image,
      location: location,
      properties: properties as? [String : Any]
    )
    
    print("setting profile = ", profile)
    
    KlaviyoSDK().set(profile: profile)
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
  
//  TODO: doesn't seem to work. need to investigate
  @objc
  func setExternalId(_ value: String) {
    print("setting external id = ", value)
    KlaviyoSDK().set(externalId: value)
  }
  
  @objc
  func resetProfile() {
    print("resetting profile")
    KlaviyoSDK().resetProfile()
  }
  
  @objc
  func requestPushPermission(
    _ value: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    print("requesting permissions for ", value)
    
    let permissions: [String: UNAuthorizationOptions] = [
      "alert": .alert,
      "sound": .sound,
      "badge": .badge,
      "carPlay": .carPlay,
      "criticalAlert": .criticalAlert,
      "providesAppNotificationSettings": .providesAppNotificationSettings,
      "provisional": .provisional
    ]
    
    let options: UNAuthorizationOptions = value
      .compactMap { permissions[$0] }
      .reduce([]) { $0.union($1) }
    
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: options) { granted, error in
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
  func sendTestEvent() {
    let testEvent = Event(name: .CustomEvent("Test Event"),
                      properties: [:],
                      profile: [:])
    KlaviyoSDK().create(event: testEvent)
  }
  
  // MARK: Getters
  
  @objc
  func getEmail(_ callback: RCTResponseSenderBlock) {
    print("in get email")
    callback([KlaviyoSDK().email ?? ""])
  }
  
  @objc
  func getPhoneNumber(_ callback: RCTResponseSenderBlock) {
    callback([KlaviyoSDK().phoneNumber ?? ""])
  }
  
  @objc
  func getExternalId(_ callback: RCTResponseSenderBlock) {
    print("in get email")
    callback([KlaviyoSDK().externalId ?? ""])
  }
  
  @objc
  func getPushToken(_ callback: RCTResponseSenderBlock) {
    callback([KlaviyoSDK().pushToken ?? ""])
  }
}



