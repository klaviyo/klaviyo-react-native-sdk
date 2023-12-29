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
  public static func setProfile(
      _ email: String? = nil,
      phoneNumber: String? = nil,
      externalId: String? = nil,
      firstName: String? = nil,
      lastName: String? = nil,
      organization: String? = nil,
      title: String? = nil,
      image: String? = nil,
      address1: String? = nil,
      address2: String? = nil,
      city: String? = nil,
      country: String? = nil,
      latitude: NSNumber? = nil,
      longitude: NSNumber? = nil,
      region: String? = nil,
      zip: String? = nil,
      timezone: String? = nil,
      properties: NSDictionary? = nil
    ) {
      let location = Profile.Location(
        address1: address1,
        address2: address2,
        city: city,
        country: country,
        latitude: latitude as? Double,
        longitude: longitude as? Double,
        region: region,
        zip: zip,
        timezone: timezone
      )

      let profile = Profile(
        email: email,
        phoneNumber: phoneNumber,
        externalId: externalId,
        firstName: firstName,
        lastName: lastName,
        organization: organization,
        title: title,
        image: image,
        location: location,
        properties: properties as? [String : Any]
      )

      KlaviyoSDK().set(profile: profile)
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
