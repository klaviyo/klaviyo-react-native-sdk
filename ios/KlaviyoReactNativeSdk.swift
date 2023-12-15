@objc(KlaviyoReactNativeSdk)
class KlaviyoReactNativeSdk: NSObject {

  @objc(multiply:withB:withResolver:withRejecter:)
  func multiply(a: Float, b: Float, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
    resolve(a*b)
  }

  @objc(createEvent:)
  func createEvent(event: NSDictionary) -> Void {
      print(event)
  }
}
