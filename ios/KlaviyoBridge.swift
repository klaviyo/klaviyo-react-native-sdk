import KlaviyoSwift

@objc
public class KlaviyoBridge: NSObject {
  enum ProfileProperty: String, CaseIterable {
      case email = "email"
      case phoneNumber = "phone_number"
      case externalId = "external_id"

      case firstName = "first_name"
      case lastName = "last_name"
      case title = "title"
      case organization = "organization"
      case image = "image"

      case address1 = "address1"
      case address2 = "address2"
      case city = "city"
      case country = "country"
      case zip = "zip"
      case region = "region"
      case latitude = "latitude"
      case longitude = "longitude"
      case timezone = "timezone"

      case location = "location"
      case properties = "properties"
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

      // swiftlint:disable cyclomatic_complexity
      static func getEventType(_ str: String) -> Event.EventName? {
      switch str {
      case "$opened_app":
          return .OpenedPush
      case "$viewed_product":
          return .ViewedProduct
      case "$searched_products":
          return .SearchedProducts
      case "$started_checkout":
          return .StartedCheckout
      case "$placed_order":
          return .PlacedOrder
      case "$ordered_product":
          return .OrderedProduct
      case "$cancelled_order":
          return .CancelledOrder
      case "$paid_for_order":
          return .PaidForOrder
      case "$subscribed_to_back_in_stock":
          return .SubscribedToBackInStock
      case "$subscribed_to_coming_soon":
          return .SubscribedToComingSoon
      case "$subscribed_to_list":
          return .SubscribedToList
      case "$successful_payment":
          return .SuccessfulPayment
      case "$failed_payment":
          return .FailedPayment
      default:
          break
      }
      return nil
      }
      // swiftlint:enable cyclomatic_complexity
  }

  @objc
  public static var getEventTypesKeys: [String: String] {
      EventType.allCases.getDictionaryFromEnum()
  }

  @objc
  public static var getProfilePropertyKeys: [String: String] {
      ProfileProperty.allCases.getDictionaryFromEnum()
  }

  @objc
  public static func initialize(_ token: String) {
      KlaviyoSDK().initialize(with: token)
  }

  @objc
  public static func setProfile(
      _ profileDict: [String: AnyObject]
  ) {
      var location: Profile.Location?
      if let locationDict = profileDict[ProfileProperty.location.rawValue] as? [String: AnyObject] {
          location = Profile.Location(
            address1: locationDict[ProfileProperty.address1.rawValue] as? String,
            address2: locationDict[ProfileProperty.address2.rawValue] as? String,
            city: locationDict[ProfileProperty.city.rawValue] as? String,
            country: locationDict[ProfileProperty.country.rawValue] as? String,
            latitude: locationDict[ProfileProperty.latitude.rawValue] as? Double,
            longitude: locationDict[ProfileProperty.longitude.rawValue] as? Double,
            region: locationDict[ProfileProperty.region.rawValue] as? String,
            zip: locationDict[ProfileProperty.zip.rawValue] as? String,
            timezone: locationDict[ProfileProperty.timezone.rawValue] as? String
          )
      }

      let profile = Profile(
        email: profileDict[ProfileProperty.email.rawValue] as? String,
        phoneNumber: profileDict[ProfileProperty.phoneNumber.rawValue] as? String,
        externalId: profileDict[ProfileProperty.externalId.rawValue] as? String,
        firstName: profileDict[ProfileProperty.firstName.rawValue] as? String,
        lastName: profileDict[ProfileProperty.lastName.rawValue] as? String,
        organization: profileDict[ProfileProperty.organization.rawValue] as? String,
        title: profileDict[ProfileProperty.title.rawValue] as? String,
        image: profileDict[ProfileProperty.image.rawValue] as? String,
        location: location,
        properties: profileDict[ProfileProperty.properties.rawValue] as? [String: Any]
      )

      KlaviyoSDK().set(profile: profile)
  }

  @objc
  public static func setExternalId(_ value: String) {
    KlaviyoSDK().set(externalId: value)
  }

  @objc
  public static func getExternalId() -> String {
      return KlaviyoSDK().externalId ?? ""
  }

  @objc
  public static func setEmail(_ value: String) {
    KlaviyoSDK().set(email: value)
  }

  @objc
  public static func getEmail() -> String {
      return KlaviyoSDK().email ?? ""
  }

  @objc
  public static func setPhoneNumber(_ value: String) {
    KlaviyoSDK().set(phoneNumber: value)
  }

  @objc
  public static func getPhoneNumber() -> String {
      return KlaviyoSDK().phoneNumber ?? ""
  }

  @objc
  public static func resetProfile() {
    KlaviyoSDK().resetProfile()
  }

  @objc
  public static func setPushToken(_ value: String) {
    KlaviyoSDK().set(pushToken: value)
  }

  @objc
  public static func getPushToken() -> String {
      return KlaviyoSDK().pushToken ?? ""
  }

  @objc
  public static func createEvent(event: [String: AnyObject]) {
      guard let name = event["name"] as? String, !name.isEmpty,
            let eventType = EventType.getEventType(name) else {
          return
      }

      let event = Event(
          name: eventType,
          properties: event["properties"] as? [String: Any],
          value: event["value"] as? Double,
          uniqueId: event["uniqueId"] as? String
      )

      KlaviyoSDK().create(event: event)
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

    // swiftlint:disable force_try
    func convertToSnakeCase(_ input: String) -> String {
        let regex = try! NSRegularExpression(pattern: "([a-z])([A-Z])", options: [])
        let range = NSRange(location: 0, length: input.utf16.count)
        var snakeCase = regex.stringByReplacingMatches(in: input, options: [], range: range, withTemplate: "$1_$2")

        snakeCase = snakeCase.uppercased()
        // to aviod the $ in event names
        snakeCase = snakeCase.replacingOccurrences(of: "$", with: "")
        return snakeCase
    }
    // swiftlint:enable force_try
}
