//
//  KlaviyoBridge+Inbox.swift
//  klaviyo-react-native-sdk
//
//  Mobile Inbox forwarding. KlaviyoInbox is opt-in, so every method is guarded by
//  `#if canImport(KlaviyoInbox)` and rejects with `INBOX_UNAVAILABLE` when it is not linked.
//

import Foundation
#if canImport(KlaviyoInbox)
import KlaviyoInbox
#endif
import KlaviyoSwift

extension KlaviyoBridge {
    /// Whether the native Inbox module is linked into this build.
    @objc
    public static var isInboxAvailable: Bool {
        #if canImport(KlaviyoInbox)
        return true
        #else
        return false
        #endif
    }

    // MARK: - Mobile Inbox

    /// The codes an inbox call rejects with.
    private enum InboxErrorCode {
        static let storageFailure = "INBOX_STORAGE_FAILURE"
        static let invalidCursor = "INBOX_INVALID_CURSOR"
        static let unavailable = "INBOX_UNAVAILABLE"
    }

    /// Holds the change subscription, since an extension cannot declare a stored property. The
    /// task must be cancelled, not just dropped, to stop it. Access is serialized through `lock`.
    private enum InboxState {
        static var changeTask: Task<Void, Never>?
        static let lock = NSLock()
    }

    /// Fetches one page of the inbox. Every option is optional: native clamps `pageSize` and applies
    /// its own filter defaults, and the cursor is passed through untouched.
    @objc
    public static func fetchInboxPage(
        options: [String: Any]?,
        resolve: @escaping ([String: Any]) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        let pageSize = options?["pageSize"] as? Int
        let cursorToken = options?["cursor"] as? String

        // Reject an unrecognized filter rather than substituting a default.
        var readFilter = InboxReadFilter.all
        var archiveFilter = InboxArchiveFilter.active
        if let rawReadFilter = options?["readFilter"] {
            guard let parsed = inboxReadFilter(from: rawReadFilter) else {
                reject(
                    InboxErrorCode.storageFailure,
                    "Unrecognized inbox readFilter '\(rawReadFilter)'"
                )
                return
            }
            readFilter = parsed
        }
        if let rawArchiveFilter = options?["archiveFilter"] {
            guard let parsed = inboxArchiveFilter(from: rawArchiveFilter) else {
                reject(
                    InboxErrorCode.storageFailure,
                    "Unrecognized inbox archiveFilter '\(rawArchiveFilter)'"
                )
                return
            }
            archiveFilter = parsed
        }

        Task {
            let cursor = cursorToken.map { InboxCursor(token: $0) }
            let query = InboxQuery(
                pageSize: pageSize ?? InboxQuery.defaultPageSize,
                cursor: cursor,
                readFilter: readFilter,
                archiveFilter: archiveFilter
            )

            do {
                let page = try await KlaviyoSDK().mobileInbox.fetchPage(query)
                resolve([
                    "messages": page.messages.map { inboxMessagePayload($0) },
                    "nextCursor": page.nextCursor.map { $0.token } as Any
                ])
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Counts unread, unarchived messages.
    @objc
    public static func fetchInboxUnreadCount(
        resolve: @escaping (NSNumber) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        Task {
            do {
                let unread = try await KlaviyoSDK().mobileInbox.fetchUnreadCount()
                resolve(NSNumber(value: unread))
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Applies a local read/archived state to one message. Resolves `true` when the message exists,
    /// whether or not the state changed, and `false` when it does not.
    @objc
    public static func updateInboxMessageState(
        id: String,
        state: String,
        resolve: @escaping (Bool) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        // Reject an unrecognized state rather than applying something else.
        guard let messageState = inboxMessageState(from: state) else {
            reject(InboxErrorCode.storageFailure, "Unrecognized inbox message state '\(state)'")
            return
        }

        Task {
            do {
                let exists = try await KlaviyoSDK().mobileInbox.setMessageState(messageState, for: id)
                resolve(exists)
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Reports a click on a stored message, or on one of its buttons, as a Clicked App Inbox Message
    /// event. Resolves `true` when the click was queued, and `false` when the message or button is
    /// not found. A click never changes the message's read or archived state.
    @objc
    public static func trackInboxMessageClick(
        id: String,
        actionId: String?,
        properties: [String: AnyObject]?,
        resolve: @escaping (Bool) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        let clickProperties = (fixNSNumberTypes(properties as Any) as? [String: Any]) ?? [:]

        Task {
            do {
                let queued = try await KlaviyoSDK().mobileInbox.trackMessageClick(
                    messageID: id,
                    actionID: actionId,
                    properties: clickProperties
                )
                resolve(queued)
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Applies a local read/archived state to every message that matches a filter. Resolves how many
    /// messages changed. Both filters are required, since a bulk change has no safe default.
    @objc
    public static func updateInboxMessageStates(
        state: String,
        readFilter: String,
        archiveFilter: String,
        resolve: @escaping (NSNumber) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        // Reject an unrecognized value rather than apply a bulk change to the wrong messages.
        guard let messageState = inboxMessageState(from: state) else {
            reject(InboxErrorCode.storageFailure, "Unrecognized inbox message state '\(state)'")
            return
        }
        guard let read = inboxReadFilter(from: readFilter) else {
            reject(InboxErrorCode.storageFailure, "Unrecognized inbox readFilter '\(readFilter)'")
            return
        }
        guard let archive = inboxArchiveFilter(from: archiveFilter) else {
            reject(InboxErrorCode.storageFailure, "Unrecognized inbox archiveFilter '\(archiveFilter)'")
            return
        }

        Task {
            do {
                let changed = try await KlaviyoSDK().mobileInbox.setMessageState(
                    messageState,
                    matching: .where(read: read, archive: archive)
                )
                resolve(NSNumber(value: changed))
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Removes every message this device has for the current company, and resolves how many were
    /// removed. Messages for other companies are left alone.
    @objc
    public static func clearInbox(
        resolve: @escaping (NSNumber) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        Task {
            do {
                resolve(NSNumber(value: try await KlaviyoSDK().mobileInbox.clearAll()))
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Starts forwarding the native inbox change signal to JS. The event carries no payload: it is
    /// an invalidation, not a durable delivery.
    @objc
    public static func registerInboxChangeHandler(emit: @escaping @Sendable () -> Bool) {
        #if canImport(KlaviyoInbox)
        // One subscription at a time: replace, don't stack.
        unregisterInboxChangeHandler()

        let changes = KlaviyoSDK().mobileInbox.changes
        let task = Task {
            for await _ in changes {
                // The module was deallocated, so stop iterating.
                guard emit() else { return }
            }
        }

        InboxState.lock.lock()
        let replaced = InboxState.changeTask
        InboxState.changeTask = task
        InboxState.lock.unlock()

        // Cancel a task a concurrent register stored in the meantime, rather than leaking it.
        replaced?.cancel()
        #endif
    }

    /// Stops forwarding inbox change signals and releases the native subscription.
    @objc
    public static func unregisterInboxChangeHandler() {
        InboxState.lock.lock()
        let task = InboxState.changeTask
        InboxState.changeTask = nil
        InboxState.lock.unlock()

        task?.cancel()
    }

    #if canImport(KlaviyoInbox)
    /// Maps a state string onto the native `InboxMessageState`.
    private static func inboxMessageState(from rawValue: String) -> InboxMessageState? {
        switch rawValue {
        case "read": return .read
        case "unread": return .unread
        case "archived": return .archived
        case "unarchived": return .unarchived
        default: return nil
        }
    }

    /// Maps a read-filter string onto the native `InboxReadFilter`.
    private static func inboxReadFilter(from rawValue: Any) -> InboxReadFilter? {
        guard let rawValue = rawValue as? String else { return nil }
        switch rawValue {
        case "all": return .all
        case "unread": return .unread
        case "read": return .read
        default: return nil
        }
    }

    /// Maps an archive-filter string onto the native `InboxArchiveFilter`.
    private static func inboxArchiveFilter(from rawValue: Any) -> InboxArchiveFilter? {
        guard let rawValue = rawValue as? String else { return nil }
        switch rawValue {
        case "active": return .active
        case "archived": return .archived
        case "all": return .all
        default: return nil
        }
    }

    /// Maps a native `InboxError` to a rejection code and message.
    private static func inboxErrorPayload(_ error: Error) -> (String, String) {
        guard let inboxError = error as? InboxError else {
            return (
                InboxErrorCode.storageFailure,
                "Mobile Inbox call failed: \(error.localizedDescription)"
            )
        }

        switch inboxError {
        case .invalidCursor:
            return (
                InboxErrorCode.invalidCursor,
                "The inbox cursor is malformed, belongs to another inbox, or was issued under different filters"
            )
        case .storageFailure:
            return (InboxErrorCode.storageFailure, "The inbox store could not complete the call")
        }
    }

    /// Converts a public `InboxMessage` into the bridge's wire format, with timestamps as epoch
    /// milliseconds.
    private static func inboxMessagePayload(_ message: InboxMessage) -> [String: Any] {
        var payload: [String: Any] = [
            "id": message.id,
            "defaultDestination": inboxDestinationPayload(message.defaultDestination),
            "customData": message.customData,
            "actions": message.actions.map { action in
                [
                    "id": action.id,
                    "label": action.label,
                    "destination": inboxDestinationPayload(action.destination)
                ] as [String: Any]
            },
            "sentAt": epochMilliseconds(message.sentAt),
            "receivedAt": epochMilliseconds(message.receivedAt),
            // `null` means the push requested no badge change.
            "badge": message.badge.flatMap(inboxBadgeValue) ?? NSNull(),
            "isRead": message.isRead,
            "isArchived": message.isArchived,
            "source": message.source.rawValue
        ]

        if let title = message.title { payload["title"] = title }
        if let body = message.body { payload["body"] = body }
        if let mediaUrl = message.mediaURL { payload["mediaUrl"] = mediaUrl.absoluteString }
        if let mediaType = message.mediaType { payload["mediaType"] = mediaType }
        if let collapseId = message.collapseID { payload["collapseId"] = collapseId }

        return payload
    }

    /// Converts an `InboxDestination` into the bridge's wire format. The type crosses as its raw
    /// string.
    private static func inboxDestinationPayload(_ destination: InboxDestination) -> [String: Any] {
        var payload: [String: Any] = ["type": destination.type.rawValue]
        if let url = destination.url {
            payload["url"] = url.absoluteString
        }
        return payload
    }

    /// Flattens the native badge to a single number: the Klaviyo badge value when the push set one,
    /// otherwise `aps.badge`. Nil when neither is present.
    private static func inboxBadgeValue(_ badge: InboxBadge) -> Int? {
        badge.value ?? badge.apsBadge
    }

    /// Converts a `Date` to milliseconds since the Unix epoch.
    private static func epochMilliseconds(_ date: Date) -> Int64 {
        Int64((date.timeIntervalSince1970 * 1000).rounded())
    }
    #endif
}
