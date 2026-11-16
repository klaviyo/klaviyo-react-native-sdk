package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import com.klaviyo.core.Registry
import com.klaviyo.inbox.InboxArchiveFilter
import com.klaviyo.inbox.InboxChangeListener
import com.klaviyo.inbox.InboxCursor
import com.klaviyo.inbox.InboxException
import com.klaviyo.inbox.InboxMessage
import com.klaviyo.inbox.InboxPage
import com.klaviyo.inbox.InboxQuery
import com.klaviyo.inbox.InboxReadFilter
import com.klaviyo.inbox.InboxResult
import com.klaviyo.inbox.InboxStateChange
import com.klaviyo.inbox.KlaviyoInbox
import com.klaviyo.inbox.MobileInboxProvider

/**
 * Android implementation of the Mobile Inbox bridge.
 *
 * Compiled only when the inbox source set is enabled (`klaviyoIncludeInbox=true`); see
 * `android/build.gradle`. [InboxBridgeProvider] loads it reflectively, so a default build links
 * without it.
 *
 * Every call is safe from the main thread: [KlaviyoInbox] runs the store work on the SDK's
 * background dispatcher and delivers its callback on the main thread, so no database work ever
 * happens on the UI thread here.
 */
internal class InboxBridgeImpl : InboxBridge {
  /**
   * Stable error codes the JS layer switches on. They are part of the public contract and are kept
   * byte-identical to the iOS bridge.
   */
  private object InboxErrorCode {
    const val STORAGE_FAILURE = "INBOX_STORAGE_FAILURE"
    const val INVALID_CURSOR = "INBOX_INVALID_CURSOR"
    const val UNAVAILABLE = "INBOX_UNAVAILABLE"
    const val UNSUPPORTED = "INBOX_UNSUPPORTED"
  }

  /**
   * Whether the native inbox implements clear.
   *
   * Always false on Android: `MobileInbox` exposes no public clear, only the internal
   * `InboxRepository.clearByCompanyId` / `clearAll`, which nothing calls. Reaching into those would
   * invent a contract the native SDK has not published, so this reports unsupported instead.
   */
  override fun isClearAvailable(): Boolean = false

  override fun isAvailable(): Boolean = Registry.isRegistered<MobileInboxProvider>()

  override fun fetchPage(
    options: ReadableMap?,
    promise: Promise,
  ) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }

    // The cursor is opaque: only its presence and string type are inspected here.
    val cursorToken =
      options
        ?.takeIf { it.hasKey(CURSOR) && it.getType(CURSOR) == ReadableType.String }
        ?.getString(CURSOR)
        ?.takeIf { it.isNotEmpty() }

    val pageSize =
      options
        ?.takeIf { it.hasKey(PAGE_SIZE) && it.getType(PAGE_SIZE) == ReadableType.Number }
        ?.getInt(PAGE_SIZE)

    // The JS layer validates these before calling, so an unrecognized value here means a native
    // caller bypassed it. Rejecting keeps the contract honest rather than silently substituting a
    // default, which would return the wrong messages while looking like it worked.
    val readFilter =
      when (val raw = options?.filterOrNull(READ_FILTER)) {
        null -> InboxReadFilter.ALL
        "all" -> InboxReadFilter.ALL
        "unread" -> InboxReadFilter.UNREAD
        "read" -> InboxReadFilter.READ
        else -> {
          promise.reject(InboxErrorCode.STORAGE_FAILURE, "Unrecognized inbox readFilter '$raw'")
          return
        }
      }

    val archiveFilter =
      when (val raw = options?.filterOrNull(ARCHIVE_FILTER)) {
        null -> InboxArchiveFilter.ACTIVE
        "active" -> InboxArchiveFilter.ACTIVE
        "archived" -> InboxArchiveFilter.ARCHIVED
        "all" -> InboxArchiveFilter.ALL
        else -> {
          promise.reject(
            InboxErrorCode.STORAGE_FAILURE,
            "Unrecognized inbox archiveFilter '$raw'",
          )
          return
        }
      }

    val query =
      InboxQuery(
        pageSize = pageSize ?: InboxQuery.DEFAULT_PAGE_SIZE,
        cursor = cursorToken?.let(::InboxCursor),
        readFilter = readFilter,
        archiveFilter = archiveFilter,
      )

    KlaviyoInbox.fetchPage(query) { result ->
      when (result) {
        is InboxResult.Success -> promise.resolve(result.value.toWritableMap())
        is InboxResult.Failure -> promise.reject(result.exception.code(), result.exception.message)
      }
    }
  }

  override fun fetchUnreadCount(promise: Promise) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }

    KlaviyoInbox.fetchUnreadCount { result ->
      when (result) {
        is InboxResult.Success -> promise.resolve(result.value)
        is InboxResult.Failure -> promise.reject(result.exception.code(), result.exception.message)
      }
    }
  }

  override fun updateMessageState(
    messageId: String,
    state: String,
    promise: Promise,
  ) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }

    // The JS layer validates the state before calling, so an unrecognized value here means a
    // native caller bypassed it. Rejecting keeps the contract honest.
    val change =
      when (state) {
        "read" -> InboxStateChange.MARK_READ
        "unread" -> InboxStateChange.MARK_UNREAD
        "archived" -> InboxStateChange.ARCHIVE
        "unarchived" -> InboxStateChange.UNARCHIVE
        else -> {
          promise.reject(
            InboxErrorCode.STORAGE_FAILURE,
            "Unrecognized inbox message state '$state'",
          )
          return
        }
      }

    KlaviyoInbox.updateMessageState(messageId, change) { result ->
      when (result) {
        is InboxResult.Success -> promise.resolve(result.value)
        is InboxResult.Failure -> promise.reject(result.exception.code(), result.exception.message)
      }
    }
  }

  /**
   * Removes one message from this device.
   *
   * Unsupported on Android. `MobileInbox` has no public clear, and the internal
   * `InboxRepository.clearByCompanyId` / `clearAll` are not called by anything upstream, so
   * invoking them here would be inventing a native contract rather than bridging one.
   *
   * TODO(MAGE-1102 follow-up): replace this rejection with a call to `MobileInbox.clear(id:)` once
   * the Android SDK ships a public clear, and flip [isClearAvailable] to match.
   */
  override fun clearMessage(
    messageId: String,
    promise: Promise,
  ) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }
    promise.reject(
      InboxErrorCode.UNSUPPORTED,
      "Inbox clear is not available on this platform or native version",
    )
  }

  /**
   * Removes several messages from this device.
   *
   * Unsupported on Android; see [clearMessage].
   */
  override fun clearMessages(
    messageIds: List<String>,
    promise: Promise,
  ) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }
    promise.reject(
      InboxErrorCode.UNSUPPORTED,
      "Inbox clear is not available on this platform or native version",
    )
  }

  /**
   * The listener currently registered with the native SDK, or null when nothing is subscribed.
   *
   * Held so [unregisterChangeHandler] can remove exactly the instance that was added: the native SDK
   * keys listeners by identity. Access is guarded by [changeLock].
   */
  private var changeListener: InboxChangeListener? = null
  private val changeLock = Any()

  /**
   * Starts forwarding inbox change invalidations to JS.
   *
   * Delegates collection to the native SDK's `KlaviyoInbox.addChangeListener`, which collects
   * `MobileInbox.changes` on the SDK's background dispatcher and delivers the callback on the main
   * thread. Collecting the signal does not open the on-device store, so nothing here touches the
   * database on the UI thread. The subscription is cancelled by
   * [KlaviyoInbox.removeChangeListener], which is what [unregisterChangeHandler] calls — including
   * from the module's `invalidate`, so it cannot leak across a reload.
   */
  override fun registerChangeHandler(onChange: () -> Unit) {
    if (!isAvailable()) return

    synchronized(changeLock) {
      // Replace rather than stack: registering twice must not deliver every change twice.
      changeListener?.let { KlaviyoInbox.removeChangeListener(it) }

      val listener = InboxChangeListener { onChange() }
      changeListener = listener
      KlaviyoInbox.addChangeListener(listener)
    }
  }

  /** Stops forwarding inbox change invalidations and cancels the native collection. */
  override fun unregisterChangeHandler() {
    synchronized(changeLock) {
      changeListener?.let { KlaviyoInbox.removeChangeListener(it) }
      changeListener = null
    }
  }

  /** Maps a native [InboxException] to the bridge's stable code. */
  private fun InboxException.code(): String =
    when (this) {
      is InboxException.InvalidCursor -> InboxErrorCode.INVALID_CURSOR
      is InboxException.StorageFailure -> InboxErrorCode.STORAGE_FAILURE
    }

  /**
   * Converts a page to the bridge's wire format.
   *
   * The cursor crosses as its opaque token and nothing else.
   */
  private fun InboxPage.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
      val messagesArray = Arguments.createArray()
      messages.forEach { messagesArray.pushMap(it.toWritableMap()) }
      putArray("messages", messagesArray)
      nextCursor?.let { putString("nextCursor", it.token) }
    }

  /**
   * Converts a message to the bridge's wire format.
   *
   * Only normalized, public values cross here — never a stored entity or a raw push payload.
   * `sentAt`, `receivedAt` and `badge` cross as epoch milliseconds / counts or null, matching the
   * iOS bridge; the JS layer drops an absent timestamp and preserves a null badge.
   */
  private fun InboxMessage.toWritableMap(): WritableMap {
    val actionsArray = Arguments.createArray()
    actions.forEach { action ->
      actionsArray.pushMap(
        Arguments.createMap().apply {
          putString("id", action.id)
          putString("label", action.label)
          putMap("destination", action.destination.toWritableMap())
        },
      )
    }

    return Arguments.createMap().apply {
      putString("id", id)
      title?.let { putString("title", it) }
      body?.let { putString("body", it) }
      putMap("defaultDestination", defaultDestination.toWritableMap())
      mediaUrl?.let { putString("mediaUrl", it) }
      mediaType?.let { putString("mediaType", it) }
      putMap(
        "customData",
        Arguments.createMap().apply {
          customData.forEach { (key, value) -> putString(key, value) }
        },
      )
      putArray("actions", actionsArray)
      // Local copies: these are public API properties from another module, so Kotlin can't smart
      // cast them after a null check.
      val sentAtValue = sentAt
      val receivedAtValue = receivedAt
      val badgeValue = badge
      if (sentAtValue != null) putDouble("sentAt", sentAtValue.toDouble()) else putNull("sentAt")
      if (receivedAtValue != null) {
        putDouble("receivedAt", receivedAtValue.toDouble())
      } else {
        putNull("receivedAt")
      }
      collapseId?.let { putString("collapseId", it) }
      // A null badge means "this push requested no badge change", which the JS layer preserves, so
      // it stays distinct from an omitted field.
      if (badgeValue != null) putInt("badge", badgeValue) else putNull("badge")
      putBoolean("isRead", isRead)
      putBoolean("isArchived", isArchived)
      putString("source", source.rawValue)
      // TODO(MAGE-1140): add `readUpdatedAt`, `archivedUpdatedAt` and `expiredAt` here once
      // `com.klaviyo.inbox.InboxMessage` exposes them publicly. Today they live only on the Room
      // entity (`readUpdatedAt`, `archivedUpdatedAt`, `expiresAt`), and reading that would leak a
      // persistence type across the bridge. Android has no catch-all `updatedAt` in its model at
      // all, so that field will stay absent here even after the per-state timestamps land.
      //
      // Note the naming mismatch to reconcile when that happens: Android calls the expiry field
      // `expiresAt` while the wrapper and iOS use `expiredAt`. The wrapper key is `expiredAt`.
    }
  }

  /** Converts a destination to the bridge's wire format, its type as the raw string. */
  private fun com.klaviyo.inbox.InboxDestination.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
      putString("type", type.rawValue)
      url?.let { putString("url", it) }
    }

  /**
   * Reads one filter value off the options map, or null when the key is absent.
   *
   * A key that is present but not a string is reported as the empty string so the caller's `when`
   * rejects it, rather than being conflated with "not specified" and silently defaulted.
   */
  private fun ReadableMap.filterOrNull(key: String): String? {
    if (!hasKey(key)) return null
    return if (getType(key) == ReadableType.String) getString(key) ?: "" else ""
  }

  private companion object Keys {
    const val PAGE_SIZE = "pageSize"
    const val CURSOR = "cursor"
    const val READ_FILTER = "readFilter"
    const val ARCHIVE_FILTER = "archiveFilter"
  }
}
