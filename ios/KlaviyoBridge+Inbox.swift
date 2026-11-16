//
//  KlaviyoBridge+Inbox.swift
//  klaviyo-react-native-sdk
//
//  Mobile Inbox forwarding. Split out of KlaviyoBridge.swift so the existing bridge does not grow
//  another several hundred lines, and so the whole inbox surface lives in one file.
//
//  The native InBox product is opt-in: the podspec only adds the `KlaviyoInbox` dependency when
//  `KLAVIYO_INCLUDE_INBOX=true`, so the default build compiles without it. Every method below is
//  guarded by `#if canImport(KlaviyoInbox)` and falls back to an `INBOX_UNAVAILABLE` rejection, so
//  this file compiles either way.
//

import Foundation
#if canImport(KlaviyoInbox)
import KlaviyoInbox
#endif
import KlaviyoSwift

extension KlaviyoBridge {
    /// Whether the native Inbox module is linked into this build.
    ///
    /// Opt-in, unlike Forms and Location: the podspec only adds the `KlaviyoInbox` dependency when
    /// `KLAVIYO_INCLUDE_INBOX` is `true`, so the default build reports `false` and every inbox call
    /// rejects with `INBOX_UNAVAILABLE`.
    @objc
    public static var isInboxAvailable: Bool {
        #if canImport(KlaviyoInbox)
        return true
        #else
        return false
        #endif
    }

    /// Whether the linked native inbox implements the clear operations.
    ///
    /// `MobileInbox.clear(id:)` / `clear(ids:)` are iOS-only today; Android's native inbox has no
    /// public equivalent. The JS layer reads this to answer `Klaviyo.capabilities.clear` without
    /// provoking a failed call.
    @objc
    public static var isInboxClearAvailable: Bool {
        #if canImport(KlaviyoInbox)
        return true
        #else
        return false
        #endif
    }

    // MARK: - Mobile Inbox

    /// Stable error codes the JS layer switches on. They are part of the public contract, so they
    /// are spelled out here rather than derived from anything upstream. Android's bridge keeps a
    /// byte-identical set.
    private enum InboxErrorCode {
        static let storageFailure = "INBOX_STORAGE_FAILURE"
        static let invalidCursor = "INBOX_INVALID_CURSOR"
        static let unavailable = "INBOX_UNAVAILABLE"
    }

    /// Mutable inbox state.
    ///
    /// A Swift extension cannot declare a stored property, so the change subscription lives in this
    /// file-scoped holder instead of on `KlaviyoBridge` itself. Iterating `MobileInbox.changes`
    /// keeps the stream alive, so it must be cancelled — not merely dropped — to stop delivering.
    ///
    /// Register and unregister are both reachable from the JS bridge and can interleave with an
    /// in-flight register, so access is serialized through `lock`: a task started by a register
    /// that lost the race is cancelled rather than leaked.
    private enum InboxState {
        static var changeTask: Task<Void, Never>?
        static let lock = NSLock()
    }

    /// Fetches one page of the inbox and maps it to the bridge's wire format.
    ///
    /// `options` carries `pageSize`, `cursor`, `readFilter` and/or `archiveFilter`. All are optional:
    /// the native SDK clamps `pageSize` itself and applies its own defaults (all reads, active
    /// archives) for an omitted filter. The cursor is passed through untouched — it is opaque to
    /// this bridge — and native rejects it if the filters differ from the ones that issued it.
    @objc
    public static func fetchInboxPage(
        options: [String: Any]?,
        resolve: @escaping ([String: Any]) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        let pageSize = options?["pageSize"] as? Int
        let cursorToken = options?["cursor"] as? String

        // The JS layer validates these before calling, so an unrecognized value here means a native
        // caller bypassed it. Rejecting keeps the contract honest rather than silently substituting
        // a default, which would return the wrong messages while looking like it worked.
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

    /// Counts unread, unarchived messages: the count an inbox badge shows.
    ///
    /// Both native SDKs compute this in the store, so it is O(1) rather than a paged scan.
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

    /// Applies a local read/archived state to one message.
    ///
    /// Resolves `true` when the message exists, whether or not the change altered it; `false` when
    /// it does not, for example because retention removed it.
    @objc
    public static func updateInboxMessageState(
        id: String,
        state: String,
        resolve: @escaping (Bool) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        // The JS layer validates the state before calling, so an unrecognized value here means a
        // native caller bypassed it. Rejecting keeps the contract honest rather than silently
        // applying something else.
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

    /// Removes one message from this device.
    ///
    /// Resolves `true` when a message was removed, `false` when this device had no such message
    /// (including before `initialize`).
    ///
    /// Note that `resetProfile()` already clears the whole inbox, for every company, natively.
    @objc
    public static func clearInboxMessage(
        id: String,
        resolve: @escaping (Bool) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        Task {
            do {
                resolve(try await KlaviyoSDK().mobileInbox.clear(id: id))
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Removes several messages from this device.
    ///
    /// Resolves how many were removed. IDs this device does not have are skipped, and the count is
    /// zero before `initialize`. The JS layer de-duplicates before calling.
    @objc
    public static func clearInboxMessages(
        ids: [String],
        resolve: @escaping (NSNumber) -> Void,
        reject: @escaping (String, String) -> Void
    ) {
        #if canImport(KlaviyoInbox)
        Task {
            do {
                resolve(NSNumber(value: try await KlaviyoSDK().mobileInbox.clear(ids: ids)))
            } catch {
                let payload = inboxErrorPayload(error)
                reject(payload.0, payload.1)
            }
        }
        #else
        reject(InboxErrorCode.unavailable, "KlaviyoInbox is not linked into this build")
        #endif
    }

    /// Starts forwarding the native inbox change signal to JS.
    ///
    /// `MobileInbox.changes` is an `AsyncStream<Void>` that yields no value, so the emitted event
    /// carries no payload by design: it is an invalidation, not a durable delivery. A change that
    /// happens while the app is suspended is never replayed.
    @objc
    public static func registerInboxChangeHandler(emit: @escaping @Sendable () -> Bool) {
        #if canImport(KlaviyoInbox)
        // One subscription at a time: replace, don't stack.
        unregisterInboxChangeHandler()

        let changes = KlaviyoSDK().mobileInbox.changes
        let task = Task {
            for await _ in changes {
                // Stop pulling if the JS bridge went away (module deallocated); iterating a stream
                // nobody consumes would keep the subscription alive for nothing.
                guard emit() else { return }
            }
        }

        InboxState.lock.lock()
        let replaced = InboxState.changeTask
        InboxState.changeTask = task
        InboxState.lock.unlock()

        // A concurrent unregister landed between the teardown above and storing this task, so
        // nothing owns it any more. Cancel it rather than leaking a live subscription.
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
    /// Maps one of the JS layer's state strings onto the native `InboxMessageState`.
    private static func inboxMessageState(from rawValue: String) -> InboxMessageState? {
        switch rawValue {
        case "read": return .read
        case "unread": return .unread
        case "archived": return .archived
        case "unarchived": return .unarchived
        default: return nil
        }
    }

    /// Maps one of the JS layer's read-filter strings onto the native `InboxReadFilter`.
    private static func inboxReadFilter(from rawValue: Any) -> InboxReadFilter? {
        guard let rawValue = rawValue as? String else { return nil }
        switch rawValue {
        case "all": return .all
        case "unread": return .unread
        case "read": return .read
        default: return nil
        }
    }

    /// Maps one of the JS layer's archive-filter strings onto the native `InboxArchiveFilter`.
    private static func inboxArchiveFilter(from rawValue: Any) -> InboxArchiveFilter? {
        guard let rawValue = rawValue as? String else { return nil }
        switch rawValue {
        case "active": return .active
        case "archived": return .archived
        case "all": return .all
        default: return nil
        }
    }

    /// Maps a native `InboxError` to the bridge's stable code plus a diagnostic message.
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

    /// Converts a public `InboxMessage` into the bridge's wire format.
    ///
    /// Only normalized, public values cross here — never a stored record or a raw push payload.
    /// `sentAt` and `receivedAt` cross as epoch milliseconds or `NSNull`, matching Android's
    /// nullable `Long`s; the JS layer drops an absent value rather than surfacing `null`.
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
            "sentAt": message.sentAt.map { epochMilliseconds($0) } ?? NSNull(),
            "receivedAt": epochMilliseconds(message.receivedAt),
            // Always present: `null` means the push requested no badge change, which the JS layer
            // preserves, so it is distinct from an omitted field.
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

        // TODO(MAGE-1140): add `readUpdatedAt`, `archivedUpdatedAt`, `updatedAt` and `expiredAt`
        // here as epoch milliseconds once `KlaviyoInbox.InboxMessage` exposes them publicly. Today
        // they exist only on the package-internal stored record, and reaching into it would leak a
        // persistence type across the bridge, so nothing is sent and the JS layer omits the fields.
        // The JS parser already accepts them, so this needs no JS change when they land.

        return payload
    }

    /// Converts an `InboxDestination` into the bridge's wire format.
    ///
    /// The type crosses as its raw string so a destination the native SDK adds later reaches JS
    /// without a bridge change.
    private static func inboxDestinationPayload(_ destination: InboxDestination) -> [String: Any] {
        var payload: [String: Any] = ["type": destination.type.rawValue]
        if let url = destination.url {
            payload["url"] = url.absoluteString
        }
        return payload
    }

    /// Flattens the native badge structure to the single number a host can apply: the Klaviyo badge
    /// value when the push set one, otherwise the raw `aps.badge`. Nil when neither is present, so
    /// the caller emits `NSNull` rather than a misleading `0`.
    private static func inboxBadgeValue(_ badge: InboxBadge) -> Int? {
        badge.value ?? badge.apsBadge
    }

    /// Converts a `Date` to milliseconds since the Unix epoch.
    private static func epochMilliseconds(_ date: Date) -> Int64 {
        Int64((date.timeIntervalSince1970 * 1000).rounded())
    }
    #endif
}
