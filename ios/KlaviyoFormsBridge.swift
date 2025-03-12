// KlaviyoFormsBridge.swift
import KlaviyoForms
import KlaviyoSwift

@objc
public class KlaviyoFormsBridge: NSObject {

    @MainActor @objc
    public static func registerForInAppForms() {
        KlaviyoSDK().registerForInAppForms()
    }

}
