import Foundation
import UIKit
import UserNotifications
import KlaviyoSwift

@objc(PushNotificationsHelper)
/// Helper class to act as a swift layer between react native's objective c code and Klaviyo SDK's swift code
class PushNotificationsHelper: NSObject {
  @objc
  static func initializeSDK(_ apiKey: String) {
    // Installation Step 4: Set your company's public api key here
    KlaviyoSDK().initialize(with: apiKey)
  }

  @objc
  static func requestPushPermission() {
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound, .badge]) { _, error in
        if let error = error {
          print("AuthError", "error while trying to authorize push", error)
        } else {
          // Installation Step 5: register for remote notifications after requesting permission on the main thread 
          DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
          }
        }
    }
  }

  @objc
  static func setPushToken(token: Data) {
    KlaviyoSDK().set(pushToken: token)
  }

  @objc
  static func handleReceivingPush(response: UNNotificationResponse, completionHandler: @escaping () -> Void ) {
    let handled = KlaviyoSDK().handle(notificationResponse: response, withCompletionHandler: completionHandler)
    if !handled {
      completionHandler()
    }
  }
}
