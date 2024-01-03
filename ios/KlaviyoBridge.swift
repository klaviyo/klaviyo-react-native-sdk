import KlaviyoSwift

@objc
public class KlaviyoBridge: NSObject {
  enum ProfileProperty: String, CaseIterable {
      case address1 = "address1"
      case address2 = "address2"
      case city = "city"
      case country = "country"
      case externalID = "external_id"
      case firstName = "first_name"
      case image = "image"
      case lastName = "last_name"
      case latitude = "latitude"
      case longitude = "longitude"
      case organization = "organization"
      case region = "region"
      case title = "title"
      case zip = "zip"
  }

  enum EventType: String, CaseIterable {
      case openedPush = "$opened_app"
      case viewedProduct = "$viewed_product"
      case searchedProducts = "$searched_products"
      case startedCheckout = "$started_checkout"
      case placedOrder = "$placed_order"
      case orderedProduct = "$ordered_product"
      case cancelledOrder = "$cancelled_order"
      case paidForOrder = "$paid_for_order"
      case subscribedToBackInStock = "$subscribed_to_back_in_stock"
      case subscribedToComingSoon = "$subscribed_to_coming_soon"
      case subscribedToList = "$subscribed_to_list"
      case successfulPayment = "$successful_payment"
      case failedPayment = "$failed_payment"
  }
    
  @objc
  public static var getEventTypesKeys: [String: String] {
      EventType.allCases.getDictionaryFromEnum()
  }
    
  @objc
  public static var getProfilePropertyKey: [String: String] {
      ProfileProperty.allCases.getDictionaryFromEnum()
  }

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
  public static func createEvent(
      _ eventName: String,
      properties: NSDictionary? = nil,
      email: String? = nil,
      phoneNumber: String? = nil,
      externalId: String? = nil,
      profile: NSDictionary? = nil,
      value: NSNumber? = nil,
      time: String? = nil,
      uniqueId: String? = nil
    ) {
        let identifiers = Event.Identifiers(email: email, phoneNumber: phoneNumber, externalId: externalId)

        let event = Event(
            name: .StartedCheckout, //TODO
            properties: properties as? [String: Any],
            identifiers: identifiers,
            profile: profile as? [String: Any],
            time: Date(),
            uniqueId: uniqueId
        )
        KlaviyoSDK().create(event: event)
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


extension Collection where Element: RawRepresentable, Element.RawValue == String {
    func getDictionaryFromEnum() -> [String: String] {
        return self.map { enumCase in
            (convertToSnakeCase(enumCase.rawValue), enumCase.rawValue)
        }.reduce(into: [String: String]()) { result, tuple in
            result[tuple.0] = tuple.1
        }
    }
    
    func convertToSnakeCase(_ input: String) -> String {
        let regex = try! NSRegularExpression(pattern: "([a-z])([A-Z])", options: [])
        let range = NSRange(location: 0, length: input.utf16.count)
        var snakeCase = regex.stringByReplacingMatches(in: input, options: [], range: range, withTemplate: "$1_$2")

        snakeCase = snakeCase.uppercased()
        return snakeCase
    }
}
