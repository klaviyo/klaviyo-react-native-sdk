import Foundation
import UIKit
import UserNotifications
import KlaviyoSwift

@objc(PushNotificationsHelper)
class PushNotificationsHelper: NSObject {
  @objc
  static func requestPushPermission() -> Void {
    // since we need the SDK to be initialized before setting the push token to it
    initializeSDK()
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
        if let error = error {
          print("AuthError", "error while trying to authorize push", error)
        } else {
          self.registerForRemoteNotifications()
        }
    }
  }

  @objc
  static func registerForRemoteNotifications() {
    DispatchQueue.main.async {
      UIApplication.shared.registerForRemoteNotifications()
    }
  }

  @objc
  static func setPushToken(token: Data) {
    KlaviyoSDK().set(pushToken: token)
  }

  @objc
  private static func initializeSDK() {
    KlaviyoSDK().initialize(with: "YOUR_PUBLIC_API_KEY")
  }
}
