package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import com.klaviyo.core.Registry
import com.klaviyo.inbox.InboxCursor
import com.klaviyo.inbox.InboxException
import com.klaviyo.inbox.InboxMessage
import com.klaviyo.inbox.InboxPage
import com.klaviyo.inbox.InboxQuery
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
  }

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

    val query =
      InboxQuery(
        pageSize = pageSize ?: InboxQuery.DEFAULT_PAGE_SIZE,
        cursor = cursorToken?.let(::InboxCursor),
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
   * Starts forwarding inbox change invalidations to JS.
   *
   * TODO(MAGE-1102): the Android SDK has no inbox invalidation API yet, so there is nothing to
   * subscribe to and this is a no-op. The JS side already registers its `NativeEventEmitter`
   * listener for `klaviyo:inboxChanged` and calls this method, so once the native SDK exposes a
   * change signal the only work left is emitting that event — with no payload — from it.
   *
   * Until then consumers must query on launch, on resume, and after their own mutations, which the
   * documented contract already requires.
   */
  override fun registerChangeHandler() {
    Registry.log.debug(
      "Klaviyo React Native SDK: inbox change invalidation is not available on Android yet (MAGE-1102)",
    )
  }

  /** Stops forwarding inbox change invalidations. See [registerChangeHandler]. */
  override fun unregisterChangeHandler() {
    // No native subscription exists yet (MAGE-1102), so there is nothing to tear down.
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
      if (sentAt != null) putDouble("sentAt", sentAt.toDouble()) else putNull("sentAt")
      if (receivedAt != null) putDouble("receivedAt", receivedAt.toDouble()) else putNull("receivedAt")
      collapseId?.let { putString("collapseId", it) }
      // A null badge means "this push requested no badge change", which the JS layer preserves, so
      // it stays distinct from an omitted field.
      if (badge != null) putInt("badge", badge) else putNull("badge")
      putBoolean("isRead", isRead)
      putBoolean("isArchived", isArchived)
      putString("source", source.rawValue)
    }
  }

  /** Converts a destination to the bridge's wire format, its type as the raw string. */
  private fun com.klaviyo.inbox.InboxDestination.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
      putString("type", type.rawValue)
      url?.let { putString("url", it) }
    }

  private companion object Keys {
    const val PAGE_SIZE = "pageSize"
    const val CURSOR = "cursor"
  }
}
