import KlaviyoSwift
import KlaviyoForms
import KlaviyoLocation
@_spi(KlaviyoPrivate) import KlaviyoCore

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

    @objc
    public static var getEventTypesKeys: [String: String] {
        [
            "VIEWED_PRODUCT": Event.EventName.viewedProductMetric.value,
            "STARTED_CHECKOUT": Event.EventName.startedCheckoutMetric.value,
            "OPENED_APP": Event.EventName.openedAppMetric.value,
            "ADDED_TO_CART": Event.EventName.addedToCartMetric.value
        ]
    }

    @objc
    public static var getProfilePropertyKeys: [String: String] {
        ProfileProperty.allCases.getDictionaryFromEnum()
    }

    @objc
    public static func initialize(_ apiKey: String) {
        KlaviyoSDK().initialize(with: apiKey)
    }

    @MainActor
    @objc
    public static func registerForInAppForms(configuration: [String: AnyObject]? = nil) {
        if let configurationLength = configuration?["sessionTimeoutDuration"] as? TimeInterval {
            KlaviyoSDK().registerForInAppForms(configuration: InAppFormsConfig(sessionTimeoutDuration: configurationLength))
        } else {
            KlaviyoSDK().registerForInAppForms()
        }
    }

    @MainActor
    @objc
    public static func unregisterFromInAppForms() {
        KlaviyoSDK().unregisterFromInAppForms()
    }

    @MainActor
    @objc
    public static func registerGeofencing() {
        Task { @MainActor in
            await KlaviyoSDK().registerGeofencing()
        }
    }

    @MainActor
    @objc
    public static func monitorGeofencesFromBackground() {
        KlaviyoSDK().monitorGeofencesFromBackground()
    }

    @MainActor
    @objc
    public static func unregisterGeofencing() {
        Task { @MainActor in
            await KlaviyoSDK().unregisterGeofencing()
        }
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
            properties: fixNSNumberTypes(profileDict[ProfileProperty.properties.rawValue] as Any) as? [String: Any]
        )

        KlaviyoSDK().set(profile: profile)
    }

    @objc
    public static func setProfileAttribute(_ key: String, value: String) {
        switch key {
        case "external_id":
            setExternalId(value)
        case "email":
            setEmail(value)
        case "phone_number":
            setPhoneNumber(value)
        default:
            KlaviyoSDK().set(profileAttribute: getProfileKey(key), value: value)
        }
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
    public static func setPushToken(_ value: String) {
        KlaviyoSDK().set(pushToken: value)
    }

    @objc
    public static func getPushToken() -> String {
        return KlaviyoSDK().pushToken ?? ""
    }

    @objc
    public static func setBadgeCount(_ value: Int) {
        KlaviyoSDK().setBadgeCount(value)
    }

    @objc
    public static func resetProfile() {
        KlaviyoSDK().resetProfile()
    }

    @objc
    public static func handleUniversalTrackingLink(_ url: URL) {
        KlaviyoSDK().handleUniversalTrackingLink(url)
    }

    @objc
    public static func createEvent(event: [String: AnyObject]) {
        guard let name = event["name"] as? String,
              !name.isEmpty,
              let eventType = getEventMetricsName(name) else {
            return
        }

        let event = Event(
            name: eventType,
            properties: fixNSNumberTypes(event["properties"] as Any) as? [String: Any],
            value: event["value"] as? Double,
            uniqueId: event["uniqueId"] as? String
        )

        KlaviyoSDK().create(event: event)
    }

    static func getEventMetricsName(_ str: String) -> Event.EventName? {
        switch str {
        case Event.EventName.viewedProductMetric.value:
            return .viewedProductMetric
        case Event.EventName.startedCheckoutMetric.value:
            return .startedCheckoutMetric
        case Event.EventName.addedToCartMetric.value:
            return .addedToCartMetric
        case Event.EventName.openedAppMetric.value:
            return .openedAppMetric
        default:
            return .customEvent(str)
        }
    }

    static func getProfileKey(_ str: String) -> Profile.ProfileKey {
        switch str {
        case ProfileProperty.firstName.rawValue:
            return Profile.ProfileKey.firstName
        case ProfileProperty.lastName.rawValue:
            return Profile.ProfileKey.lastName
        case ProfileProperty.address1.rawValue:
            return Profile.ProfileKey.address1
        case ProfileProperty.address2.rawValue:
            return Profile.ProfileKey.address2
        case ProfileProperty.title.rawValue:
            return Profile.ProfileKey.title
        case ProfileProperty.organization.rawValue:
            return Profile.ProfileKey.organization
        case ProfileProperty.city.rawValue:
            return Profile.ProfileKey.city
        case ProfileProperty.region.rawValue:
            return Profile.ProfileKey.region
        case ProfileProperty.country.rawValue:
            return Profile.ProfileKey.country
        case ProfileProperty.zip.rawValue:
            return Profile.ProfileKey.zip
        case ProfileProperty.image.rawValue:
            return Profile.ProfileKey.image
        case ProfileProperty.latitude.rawValue:
            return Profile.ProfileKey.latitude
        case ProfileProperty.longitude.rawValue:
            return Profile.ProfileKey.longitude
        default:
            return Profile.ProfileKey.custom(customKey: str)
        }
    }

    // Ensure bools and numbers are preserved as their types between the RN/Swift layers
    static func fixNSNumberTypes(_ value: Any?) -> Any? {
        guard let value = value, !(value is NSNull) else {
            return nil
        }

        switch value {
        case let num as NSNumber:
            // Differentiate between a boolean and a number
            if CFGetTypeID(num) == CFBooleanGetTypeID() {
                return num.boolValue
            }
            // Differentiate between integer and floating point numbers
            let numberType = CFNumberGetType(num)
            switch numberType {
            case .float32Type, .float64Type, .floatType, .doubleType, .cgFloatType:
                return num.doubleValue
            default:
                return num.int64Value
            }
        case let dict as [String: Any?]:
            return dict.compactMapValues { fixNSNumberTypes($0) }
        case let arr as [Any?]:
            return arr.compactMap { fixNSNumberTypes($0) }
        default:
            return value
        }
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
        return snakeCase
    }
    // swiftlint:enable force_try
}
