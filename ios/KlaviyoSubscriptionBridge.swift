import KlaviyoSwift

/// Bridges the client-subscription API to JS. Kept separate from `KlaviyoBridge.swift` to hold that
/// file under SwiftLint's file-length limit.
public extension KlaviyoBridge {
    /// Subscribes the current profile to a Klaviyo list.
    ///
    /// The payload mirrors the wire format the Android bridge reads, so both platforms accept an
    /// identical dictionary from JS.
    @objc
    static func createSubscription(subscription: [String: AnyObject]) {
        guard let listId = subscription["listId"] as? String,
              !listId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        let customSource = subscription["customSource"] as? String

        // Only a *missing* channels key means "all available marketing" — the broad grant is
        // reachable solely through the named factory on this SDK and the JS layer. An absent key
        // subscripts to nil; a JS `null` bridges to NSNull, which is a malformed value rather than
        // an omission and must not reach the fallback below.
        guard let channelsValue = subscription["channels"] else {
            KlaviyoSDK().create(
                subscription: .allAvailableMarketing(listId: listId, customSource: customSource)
            )
            return
        }

        // Present but not an object — including NSNull — is malformed, and is rejected rather than
        // quietly widening consent to every identified channel. Matches Android, which rejects a
        // present non-Map channels value.
        guard let channelsDict = channelsValue as? [String: AnyObject] else {
            return
        }

        let channels = Subscription.Channels(
            email: emailConsent(from: channelsDict["email"]),
            sms: messagingConsent(from: channelsDict["sms"]),
            whatsapp: messagingConsent(from: channelsDict["whatsapp"])
        )

        KlaviyoSDK().create(
            subscription: Subscription(listId: listId, channels: channels, customSource: customSource)
        )
    }

    /// Maps one channel's JS consent array onto ``Subscription/Channels/Email``, or `nil` when the
    /// key is absent so that channel is left untouched. An empty array stays empty, so the native
    /// SDK's own validation reports it rather than this bridge silently dropping the channel.
    ///
    /// An unrecognized value is skipped rather than failing the whole request: skipping only ever
    /// narrows the consent granted, and it keeps a newer JS layer from breaking against an older
    /// native SDK. Android skips unknown values the same way.
    private static func emailConsent(from value: AnyObject?) -> Subscription.Channels.Email? {
        guard let rawValues = value as? [String] else { return nil }

        var consent: Subscription.Channels.Email = []
        for rawValue in rawValues {
            switch rawValue {
            case "marketing": consent.insert(.marketing)
            case "open_tracking": consent.insert(.openTracking)
            default: continue
            }
        }
        return consent
    }

    /// SMS/WhatsApp counterpart to ``emailConsent(from:)``.
    private static func messagingConsent(from value: AnyObject?) -> Subscription.Channels.Messaging? {
        guard let rawValues = value as? [String] else { return nil }

        var consent: Subscription.Channels.Messaging = []
        for rawValue in rawValues {
            switch rawValue {
            case "marketing": consent.insert(.marketing)
            case "transactional": consent.insert(.transactional)
            default: continue
            }
        }
        return consent
    }
}
