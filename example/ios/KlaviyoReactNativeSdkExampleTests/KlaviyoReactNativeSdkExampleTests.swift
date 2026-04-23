import UIKit
import XCTest
import React

final class KlaviyoReactNativeSdkExampleTests: XCTestCase {
  private let timeoutSeconds: TimeInterval = 600
  private let textToLookFor = "Welcome to React"

  private func findSubview(in view: UIView, matching predicate: (UIView) -> Bool) -> Bool {
    if predicate(view) { return true }
    for subview in view.subviews where findSubview(in: subview, matching: predicate) {
      return true
    }
    return false
  }

  func testRendersWelcomeScreen() {
    guard let rootView = UIApplication.shared.delegate?.window??.rootViewController?.view else {
      XCTFail("Could not access the app's root view controller")
      return
    }

    let deadline = Date(timeIntervalSinceNow: timeoutSeconds)
    var foundElement = false
    let redboxErrorBox = RedboxErrorBox()

#if DEBUG
    RCTSetLogFunction { level, _, _, _, message in
      if level.rawValue >= RCTLogLevel.error.rawValue {
        redboxErrorBox.set(message)
      }
    }
#endif

    while deadline.timeIntervalSinceNow > 0, !foundElement, redboxErrorBox.get() == nil {
      RunLoop.main.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
      RunLoop.main.run(mode: .common, before: Date(timeIntervalSinceNow: 0.1))

      foundElement = findSubview(in: rootView) { view in
        view.accessibilityLabel == textToLookFor
      }
    }

#if DEBUG
    RCTSetLogFunction(RCTDefaultLogFunction)
#endif

    let redboxError = redboxErrorBox.get()
    XCTAssertNil(redboxError, "RedBox error: \(redboxError ?? "")")
    XCTAssertTrue(
      foundElement,
      "Couldn't find element with text '\(textToLookFor)' in \(Int(timeoutSeconds)) seconds"
    )
  }
}

// `RCTSetLogFunction` invokes its callback from whatever thread RN happens to
// log from (JS thread, module queues, etc.), while the test loop reads the
// value on the main queue. Guard access with a lock so we're not racing.
private final class RedboxErrorBox {
  private let lock = NSLock()
  private var _message: String?

  func set(_ value: String?) {
    lock.lock(); defer { lock.unlock() }
    _message = value
  }

  func get() -> String? {
    lock.lock(); defer { lock.unlock() }
    return _message
  }
}
