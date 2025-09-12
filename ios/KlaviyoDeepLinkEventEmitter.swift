import React
import KlaviyoSwift

@objc(KlaviyoDeepLinkEventEmitter)
class KlaviyoDeepLinkEventEmitter: RCTEventEmitter {

    private static var shared: KlaviyoDeepLinkEventEmitter?

    override init() {
        super.init()
        KlaviyoDeepLinkEventEmitter.shared = self
    }

    static func getSharedInstance() -> KlaviyoDeepLinkEventEmitter? {
        return shared
    }

    override func supportedEvents() -> [String]! {
        return ["klaviyoDeepLink"]
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc func emitDeepLinkEvent(_ url: URL) {
        sendEvent(withName: "klaviyoDeepLink", body: ["url": url.absoluteString])
    }

    @objc func registerDeepLinkHandler() {
        KlaviyoBridge.registerDeepLinkHandler()
    }
}
