import KlaviyoSwift
#if canImport(KlaviyoForms)
import KlaviyoForms
#endif
#if canImport(KlaviyoLocation)
@_spi(KlaviyoPrivate) import KlaviyoLocation
#endif
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
    public static var isFormsAvailable: Bool {
        #if canImport(KlaviyoForms)
        return true
        #else
        return false
        #endif
    }

    @objc
    public static var isLocationAvailable: Bool {
        #if canImport(KlaviyoLocation)
        return true
        #else
        return false
        #endif
    }

    @objc
    public static func initialize(_ apiKey: String) {
        KlaviyoSDK().initialize(with: apiKey)
    }

    @MainActor
    @objc
    public static func registerForInAppForms(configuration: [String: AnyObject]? = nil) {
        #if canImport(KlaviyoForms)
        if let configurationLength = configuration?["sessionTimeoutDuration"] as? TimeInterval {
            KlaviyoSDK().registerForInAppForms(configuration: InAppFormsConfig(sessionTimeoutDuration: configurationLength))
        } else {
            KlaviyoSDK().registerForInAppForms()
        }
        #endif
    }

    @MainActor
    @objc
    public static func unregisterFromInAppForms() {
        #if canImport(KlaviyoForms)
        KlaviyoSDK().unregisterFromInAppForms()
        #endif
    }

    @MainActor
    @objc
    public static func registerFormLifecycleHandler(callback: @escaping ([String: Any]) -> Void) {
        #if canImport(KlaviyoForms)
        KlaviyoSDK().registerFormLifecycleHandler { event in
            var params: [String: Any] = [
                "formId": event.formId as Any,
                "formName": event.formName as Any
            ]
            switch event {
            case .formShown:
                params["type"] = "formShown"
            case .formDismissed:
                params["type"] = "formDismissed"
            case let .formCtaClicked(_, _, buttonLabel, deepLinkUrl):
                params["type"] = "formCtaClicked"
                params["buttonLabel"] = buttonLabel as Any
                params["deepLinkUrl"] = deepLinkUrl.absoluteString as Any
            }
            callback(params)
        }
        #endif
    }

    @MainActor
    @objc
    public static func unregisterFormLifecycleHandler() {
        #if canImport(KlaviyoForms)
        KlaviyoSDK().unregisterFormLifecycleHandler()
        #endif
    }

    // MARK: - Auth token bridging

    /// Pending auth token requests keyed by correlation ID. The native SDK's
    /// async provider closure suspends on a continuation stored here until the
    /// JS side responds (or the request is cancelled by the SDK's timeout).
    ///
    /// A `CheckedContinuation` must be resumed exactly once. All access is
    /// serialized through `authTokenLock`, and every resume path first removes
    /// the entry from the dictionary — whichever path removes it wins and
    /// resumes; any later path finds nothing and is a no-op.
    private static var pendingAuthTokenRequests: [String: CheckedContinuation<String, Error>] = [:]
    private static let authTokenLock = NSLock()

    /// Registers a wrapper-owned auth token provider with the native SDK. When
    /// the SDK invokes the provider, this generates a correlation ID, emits it
    /// to JS via `emit`, and suspends until the JS side responds through
    /// `respondToAuthTokenRequest(id:jwt:error:)`.
    ///
    /// The token itself never crosses through here in a loggable form and is
    /// never logged; all token logging happens in the native SDK.
    @objc
    public static func registerAuthTokenProvider(emit: @escaping @Sendable ([String: Any]) -> Bool) {
        KlaviyoSDK().registerAuthTokenProvider { () async throws -> String in
            let id = UUID().uuidString
            return try await withTaskCancellationHandler {
                try await withCheckedThrowingContinuation { continuation in
                    authTokenLock.lock()
                    pendingAuthTokenRequests[id] = continuation
                    authTokenLock.unlock()
                    if !emit(["id": id]) {
                        // The JS bridge is unavailable (module deallocated), so
                        // no response will arrive. Fail fast instead of waiting
                        // for the SDK timeout, and evict so nothing leaks.
                        authTokenLock.lock()
                        let pending = pendingAuthTokenRequests.removeValue(forKey: id)
                        authTokenLock.unlock()
                        pending?.resume(throwing: authTokenError(
                            "Unable to reach the JS auth token provider (bridge unavailable)"
                        ))
                    }
                }
            } onCancel: {
                // The SDK cancels the provider task on timeout. Resolve the
                // continuation with cancellation and evict it so nothing leaks.
                //
                // If cancellation lands in the narrow window before the
                // operation stores the continuation, this finds nothing to
                // remove (a safe no-op) and the operation still stores + emits
                // afterward. That only costs a spurious `authTokenRequested`
                // event: the SDK re-checks cancellation after the provider
                // returns and discards the stale token before caching it.
                authTokenLock.lock()
                let continuation = pendingAuthTokenRequests.removeValue(forKey: id)
                authTokenLock.unlock()
                continuation?.resume(throwing: CancellationError())
            }
        }
    }

    @objc
    public static func unregisterAuthTokenProvider() {
        KlaviyoSDK().unregisterAuthTokenProvider()
        // Defense-in-depth + parity with Android: proactively fail any pending
        // requests. The SDK's unregister cancels the in-flight fetch (which
        // trips the `onCancel` above), but draining here doesn't rely on that
        // cross-module behavior. The lock-guarded remove keeps resolution
        // exactly-once — whichever path claims a continuation first wins.
        failAllPendingAuthTokenRequests(reason: "Auth token provider was unregistered")
    }

    private static func failAllPendingAuthTokenRequests(reason: String) {
        authTokenLock.lock()
        let pending = pendingAuthTokenRequests
        pendingAuthTokenRequests.removeAll()
        authTokenLock.unlock()
        for (_, continuation) in pending {
            continuation.resume(throwing: authTokenError(reason))
        }
    }

    private static func authTokenError(_ message: String) -> NSError {
        NSError(
            domain: "KlaviyoReactNativeSdk",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
    }

    /// Resolves a pending auth token request. Called from JS once the host
    /// provider has produced a token (`jwt`) or failed (`error`). Unknown or
    /// already-resolved IDs are ignored.
    ///
    /// When `isConnectivityError` is `true`, the failure is surfaced as a
    /// `URLError` with a connectivity code so the SDK's connectivity-driven
    /// refresh retry (which classifies via `URLError.isConnectivityError`)
    /// recognizes it. Other failures use a generic error, which the SDK treats
    /// as non-retryable.
    @objc
    public static func respondToAuthTokenRequest(id: String, jwt: String?, error: String?, isConnectivityError: Bool) {
        authTokenLock.lock()
        let continuation = pendingAuthTokenRequests.removeValue(forKey: id)
        authTokenLock.unlock()

        guard let continuation else {
            // Already resolved/cancelled, or never existed. Nothing to do.
            return
        }

        if let jwt {
            continuation.resume(returning: jwt)
        } else {
            let message = error ?? "Auth token provider returned no token"
            if isConnectivityError {
                continuation.resume(throwing: URLError(
                    .notConnectedToInternet,
                    userInfo: [NSLocalizedDescriptionKey: message]
                ))
            } else {
                continuation.resume(throwing: authTokenError(message))
            }
        }
    }

    @MainActor
    @objc
    public static func registerGeofencing() {
        #if canImport(KlaviyoLocation)
        KlaviyoSDK().registerGeofencing()
        #endif
    }

    @MainActor
    @objc
    public static func unregisterGeofencing() {
        #if canImport(KlaviyoLocation)
        KlaviyoSDK().unregisterGeofencing()
        #endif
    }

    @MainActor
    @objc
    public static func getCurrentGeofences(callback: @escaping ([String: AnyObject]) -> Void) {
        #if canImport(KlaviyoLocation)
        Task { @MainActor in
            let geofences = await KlaviyoSDK().getCurrentGeofences()
            let geofencesArray = geofences.map { region -> [String: AnyObject] in
                [
                    "identifier": region.identifier as AnyObject,
                    "latitude": region.center.latitude as AnyObject,
                    "longitude": region.center.longitude as AnyObject,
                    "radius": region.radius as AnyObject
                ]
            }
            callback(["geofences": geofencesArray as AnyObject])
        }
        #else
        callback(["geofences": [] as AnyObject])
        #endif
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
