import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private var reactNativeDelegate: ReactNativeDelegate?
  private var reactNativeFactory: RCTReactNativeFactory?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let delegate = ReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()
    let factory = RCTReactNativeFactory(delegate: delegate)
    reactNativeDelegate = delegate
    reactNativeFactory = factory

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    (UIApplication.shared.delegate as? AppDelegate)?.window = window
    factory.startReactNative(
      withModuleName: "KlaviyoReactNativeSdkExample",
      in: window,
      launchOptions: launchOptions(from: connectionOptions)
    )
  }

  func scene(_ scene: UIScene, openURLContexts urlContexts: Set<UIOpenURLContext>) {
    for context in urlContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    AppDelegate.Push.updateBadgeCount(0)
  }

  private func launchOptions(
    from connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any] {
    let notification = connectionOptions.notificationResponse?.notification.request.content.userInfo
    let notificationURL = (notification?["url"] as? String).flatMap { URL(string: $0) }
    let universalLink = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb && $0.webpageURL != nil
    }?.webpageURL

    var options: [UIApplication.LaunchOptionsKey: Any] = [:]
    options[.url] = connectionOptions.urlContexts.first?.url ?? universalLink ?? notificationURL
    options[.remoteNotification] = notification
    return options
  }
}

private class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
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
