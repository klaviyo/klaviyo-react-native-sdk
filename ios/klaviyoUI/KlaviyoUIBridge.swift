// KlaviyoUIBridge.swift
import KlaviyoUI

@objc(KlaviyoUIBridge)
class KlaviyoUIBridge: NSObject {

    @objc(helloWorld)
    func helloWorld() {
        KlaviyoUI.helloWorld()
    }

}
