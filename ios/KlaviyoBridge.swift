import KlaviyoSwift

@objc
public class KlaviyoBridge: NSObject {

  #if DEBUG
  // TODO: use only for testing.
  @objc
  public static func initializeSDK(_ token: String) {
      KlaviyoSDK().initialize(with: token)
  }
  #endif

  @objc
  public static func createEvent(event: [String: AnyObject]) {
    let event = Event(name: .CustomEvent(event["event"]!["name"] as! String), properties: event["properties"] as? [String: Any])
    KlaviyoSDK().create(event: event)
  }

  @objc
  public static func setEmail(_ value: String) {
    KlaviyoSDK().set(email: value)
  }

  @objc
  public static func setPhoneNumber(_ value: String) {
    KlaviyoSDK().set(phoneNumber: value)
  }

  @objc
  public static func setExternalId(_ value: String) {
    KlaviyoSDK().set(externalId: value)
  }

  @objc
  public static func resetProfile() {
    KlaviyoSDK().resetProfile()
  }

  @objc
  public static func getEmail() -> String {
      return KlaviyoSDK().email ?? ""
  }

  @objc
  public static func getPhoneNumber() -> String {
      return KlaviyoSDK().phoneNumber ?? ""
  }

  @objc
  public static func getExternalId() -> String {
      return KlaviyoSDK().externalId ?? ""
  }

  @objc
  public static func getPushToken() -> String {
      return KlaviyoSDK().pushToken ?? ""
  }
}
