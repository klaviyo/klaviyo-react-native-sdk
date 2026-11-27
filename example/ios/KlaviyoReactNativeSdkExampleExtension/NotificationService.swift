//
//  NotificationService.swift
//  KlaviyoReactNativeSdkExampleExtension
//
//  Created by Ajay Subramanya on 4/9/24.
//

// iOS Installation Step: Required for rich push, create this notification service extension
// using the steps outlined here - https://github.com/klaviyo/klaviyo-swift-sdk#rich-push-images--videos
import KlaviyoSwiftExtension
import UIKit
import UserNotifications
#if canImport(KlaviyoInboxExtension)
import KlaviyoInboxExtension
#endif

class NotificationService: UNNotificationServiceExtension {
    var request: UNNotificationRequest!
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.request = request
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = bestAttemptContent else { return }

        // Optional Mobile Inbox: capture the push first, then continue with rich push handling.
        // Capture is only compiled in when the KlaviyoInboxExtension pod is linked.
        let userInfo = request.content.userInfo
        Task {
            #if canImport(KlaviyoInboxExtension)
            await KlaviyoInboxExtensionSDK.capture(userInfo: userInfo)
            #endif
            KlaviyoExtensionSDK.handleNotificationServiceDidReceivedRequest(
                request: request,
                bestAttemptContent: bestAttemptContent,
                contentHandler: contentHandler)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        /// Called just before the extension will be terminated by the system.
        /// Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
        if let contentHandler = contentHandler,
           let bestAttemptContent = bestAttemptContent {
            KlaviyoExtensionSDK.handleNotificationServiceExtensionTimeWillExpireRequest(
                request: request,
                bestAttemptContent: bestAttemptContent,
                contentHandler: contentHandler)
        }
    }
}
