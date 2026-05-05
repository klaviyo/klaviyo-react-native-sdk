import UIKit
import React
import React_RCTAppDelegate
import UserNotifications
import FirebaseCore
import KlaviyoSwift

// For native-only push integration (no @react-native-firebase/messaging),
// see the Klaviyo Swift SDK README for guidance:
// https://github.com/klaviyo/klaviyo-swift-sdk#push-notifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

  // Change to false if you don't want debug alerts or logs.
  private let isDebug = true

  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // iOS Installation Step: Set the UNUserNotificationCenter delegate to self
    UNUserNotificationCenter.current().delegate = self

    // Initialize Firebase. See example/README.md for GoogleService-Info.plist
    // setup (real config for push, or a stub to let the build/launch succeed
    // without wiring up a Firebase project).
    FirebaseApp.configure()

    // APNs registration is driven from JS via messaging().requestPermission(),
    // which calls registerForRemoteNotifications() under the hood and produces
    // the APNs token. Note: APNs registration is independent of the user's
    // notification permission — the token is delivered as soon as the device
    // completes the APNs handshake with network connectivity, regardless of
    // whether the user has allowed notifications to be displayed. We trigger
    // the request from the "Request Push Permission" button in the UI instead
    // of here so the flow is user-driven and observable in the demo.

    // OPTIONAL: Native initialization approach (uncomment if you prefer to initialize from Swift)
    // See README.md for details on when you might want this.
    // Push.initializeSDK("YOUR_KLAVIYO_PUBLIC_API_KEY")
    // Push.requestNotificationPermission()

    // Geofencing registration is JS-driven in this example — see
    // example/src/hooks/useLocation.ts, which calls Klaviyo.registerGeofencing()
    // after the user grants location permission. Calling it from AppDelegate is
    // the "earliest possible" option but not required; the Swift SDK's
    // registerGeofencing() is safe to invoke from JS once RN init completes.

    // See `getLaunchOptionsWithURL` below — workaround for a React Native
    // cold-start deep-link issue from terminated-state remote notifications.
    let launchOptionsWithURL = getLaunchOptionsWithURL(launchOptions)

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "KlaviyoReactNativeSdkExample",
      in: window,
      launchOptions: launchOptionsWithURL
    )

    return true
  }

  // iOS Installation Step: Implement this delegate to receive and log the
  // APNs push token. Firebase's default method swizzling (enabled by default
  // when FirebaseAppDelegateProxyEnabled is absent from Info.plist) handles
  // forwarding this callback to FIRMessaging and to RNFB's internal registration
  // waiter — the app just needs to implement this method so the selector is in
  // the dispatch table for swizzling to find.
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    // OPTIONAL: Native push token handling (uncomment if not using Firebase).
    // See the Klaviyo Swift SDK README for the full native integration path:
    // https://github.com/klaviyo/klaviyo-swift-sdk#push-notifications
    // Push.setPushToken(deviceToken)

    if isDebug {
      let token = deviceToken.map { String(format: "%02x", $0) }.joined()
      print("Device Token: \(token)")
    }
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    if isDebug {
      print("Failed to register for remote notifications: \(error)")
    }
  }

  // iOS Installation Step: Implement the delegate
  // didReceiveNotificationResponse to respond to user actions (tapping on push)
  // when the app is in the background. NOTE: this delegate will NOT be called
  // if the UNUserNotificationCenter delegate isn't set.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    // iOS Installation Step: call `handleReceivingPush` and pass the arguments
    // below. If you want to intercept urls instead of them being routed to the
    // system (which would call `application:openURL:options:`), implement the
    // `deepLinkHandler` below.
    Push.handleReceivingPush(
      response: response,
      completionHandler: completionHandler,
      deepLinkHandler: { url in
        print("URL is \(url)")
        RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
      }
    )

    // iOS Installation Step: update the badge count to current - 1. You can
    // also set this to 0 if you no longer want the badge to show.
    Push.updateBadgeCount(UIApplication.shared.applicationIconBadgeNumber - 1)

    if isDebug {
      let alert = UIAlertController(
        title: "Push Notification",
        message: "handled background notifications",
        preferredStyle: .alert
      )
      alert.addAction(UIAlertAction(title: "OK", style: .default))
      window?.rootViewController?.present(alert, animated: true)
    }
  }

  // iOS Installation Step: Implement the delegate willPresentNotification to
  // handle push notifications when the app is in the foreground. NOTE: this
  // delegate will NOT be called if the UNUserNotificationCenter delegate isn't
  // set.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if isDebug {
      let userInfo = notification.request.content.userInfo
      print("Received Push Notification: \(userInfo)")
      let message = ((userInfo["aps"] as? [String: Any])?["alert"] as? [String: Any])?["body"] as? String
      let alert = UIAlertController(
        title: "Push Notification",
        message: message,
        preferredStyle: .alert
      )
      alert.addAction(UIAlertAction(title: "OK", style: .default))
      window?.rootViewController?.present(alert, animated: true)
    }

    // iOS Installation Step: call the completion handler with presentation
    // options here, such as showing a banner or playing a sound. `.list` keeps
    // the notification in Notification Center (equivalent to the iOS 13
    // `.alert` option used by the previous Objective-C AppDelegate).
    completionHandler([.banner, .list, .badge, .sound])
  }

  // iOS Installation Step: Implement this method to receive deep links. See
  // https://github.com/klaviyo/klaviyo-swift-sdk?tab=readme-ov-file#deep-linking
  // Calling `RCTLinkingManager` is required for your React Native listeners to
  // be called.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // iOS Installation Step: Implement this method to handle Universal Links
  // (https://). This is required for Klaviyo universal tracking links and
  // other HTTPS deep links. Calling `RCTLinkingManager` forwards the universal
  // link to your React Native code.
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

  // iOS Installation Step: if you want to reset the app badge count whenever
  // the app becomes active, implement this delegate method and set the badge
  // count to 0. Note that this may sometimes mean that the user would miss the
  // notification.
  func applicationDidBecomeActive(_ application: UIApplication) {
    Push.updateBadgeCount(0)
  }

  // iOS Installation Step: Handle silent push notifications (content-available: 1).
  // This method fires for both pure silent pushes and standard pushes that carry
  // content-available. Only forward pure silent pushes (no aps.alert) for
  // background processing — standard pushes are handled by willPresent/didReceive.
  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    let apsPayload = userInfo["aps"] as? [String: Any]
    let hasVisibleContent = apsPayload?["alert"] != nil

    if !hasVisibleContent {
      Push.handleSilentPush(userInfo: userInfo)

      if isDebug {
        let alert = UIAlertController(
          title: "Silent Push Received",
          message: "\(userInfo)",
          preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        window?.rootViewController?.present(alert, animated: true)
      }
    } else if apsPayload?["content-available"] != nil {
      if isDebug {
        print("Standard Push with Background Processing: \(userInfo)")
      }
    }

    // You MUST call the completion handler within ~30 seconds. Failing to do
    // so will cause iOS to throttle or stop delivering silent push
    // notifications to your app.
    completionHandler(.newData)
  }

  // MARK: - Private Helpers

  // iOS Installation Step: call this method from
  // `application:didFinishLaunchingWithOptions:` before handing launchOptions
  // to RCTReactNativeFactory. Workaround for a React Native issue where, if
  // the app is terminated, the deep link isn't sent to the RN layer when it
  // is coming from a remote notification.
  // https://github.com/facebook/react-native/issues/32350
  private func getLaunchOptionsWithURL(
    _ launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> [UIApplication.LaunchOptionsKey: Any] {
    var opts: [UIApplication.LaunchOptionsKey: Any] = launchOptions ?? [:]
    if let remoteNotification = opts[.remoteNotification] as? [String: Any],
       let urlString = remoteNotification["url"] as? String,
       opts[.url] == nil,
       let url = URL(string: urlString) {
      opts[.url] = url
    }
    return opts
  }
}

// MARK: - Klaviyo SDK Helpers
//
// These used to live in `PushNotificationsHelper.swift` so the Objective-C
// AppDelegate could call into Swift. Now that the AppDelegate is pure Swift
// they can live here directly, as a private namespace on AppDelegate.
extension AppDelegate {
  enum Push {
    static func initializeSDK(_ apiKey: String) {
      KlaviyoSDK().initialize(with: apiKey)
    }

    static func requestNotificationPermission() {
      let center = UNUserNotificationCenter.current()
      center.requestAuthorization(options: [.alert, .sound, .badge]) { _, error in
        if let error = error {
          print("AuthError", "error while trying to authorize push", error)
        } else {
          DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
          }
        }
      }
    }

    static func updateBadgeCount(_ count: Int) {
      if #available(iOS 16.0, *) {
        UNUserNotificationCenter.current().setBadgeCount(count)
      } else {
        UIApplication.shared.applicationIconBadgeNumber = count
      }
    }

    static func setPushToken(_ token: Data) {
      KlaviyoSDK().set(pushToken: token)
    }

    static func handleSilentPush(userInfo: [AnyHashable: Any]) {
      NSLog("[Klaviyo] Silent push received: %@", userInfo)
      // Perform background work here, e.g. prefetch content or sync state.
    }

    static func handleReceivingPush(
      response: UNNotificationResponse,
      completionHandler: @escaping () -> Void,
      deepLinkHandler: ((URL) -> Void)? = nil
    ) {
      let handled = KlaviyoSDK().handle(
        notificationResponse: response,
        withCompletionHandler: completionHandler,
        deepLinkHandler: deepLinkHandler
      )
      if !handled {
        completionHandler()
      }
    }
  }
}

// MARK: - React Native bridge bundle URL resolver

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
