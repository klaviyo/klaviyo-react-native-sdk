import KlaviyoSwift

@objc
public class KlaviyoBridge: NSObject {

  static let klaviyo = KlaviyoSDK()

  @objc
  public static func createEvent(event: [String: AnyObject]) {
      klaviyo.initialize(with: "LuYLmF")
      let event = Event(name: .CustomEvent(event["event"]!["name"] as! String), properties: event["properties"] as? [String: Any])
      klaviyo.create(event: event)
  }
}
