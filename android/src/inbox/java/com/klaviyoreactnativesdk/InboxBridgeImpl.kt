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
import com.klaviyo.inbox.InboxFilter
import com.klaviyo.inbox.InboxMessage
import com.klaviyo.inbox.InboxPage
import com.klaviyo.inbox.InboxQuery
import com.klaviyo.inbox.InboxReadFilter
import com.klaviyo.inbox.InboxResult
import com.klaviyo.inbox.InboxStateChange
import com.klaviyo.inbox.KlaviyoInbox
import com.klaviyo.inbox.MobileInboxProvider
import java.io.Serializable

/**
 * Mobile Inbox bridge implementation. Compiled only when `klaviyoIncludeInbox=true`, and loaded
 * reflectively by [InboxBridgeProvider].
 */
internal class InboxBridgeImpl : InboxBridge {
  /** The codes an inbox call rejects with. */
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

    // Reject an unrecognized filter rather than substituting a default.
    val rawReadFilter = options?.filterOrNull(READ_FILTER)
    val readFilter =
      if (rawReadFilter == null) {
        InboxReadFilter.ALL
      } else {
        toReadFilter(rawReadFilter) ?: run {
          promise.reject(
            InboxErrorCode.STORAGE_FAILURE,
            "Unrecognized inbox readFilter '$rawReadFilter'",
          )
          return
        }
      }

    val rawArchiveFilter = options?.filterOrNull(ARCHIVE_FILTER)
    val archiveFilter =
      if (rawArchiveFilter == null) {
        InboxArchiveFilter.ACTIVE
      } else {
        toArchiveFilter(rawArchiveFilter) ?: run {
          promise.reject(
            InboxErrorCode.STORAGE_FAILURE,
            "Unrecognized inbox archiveFilter '$rawArchiveFilter'",
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

    // Reject an unrecognized state rather than applying something else.
    val change =
      toStateChange(state) ?: run {
        promise.reject(
          InboxErrorCode.STORAGE_FAILURE,
          "Unrecognized inbox message state '$state'",
        )
        return
      }

    KlaviyoInbox.updateMessageState(messageId, change) { result ->
      when (result) {
        is InboxResult.Success -> promise.resolve(result.value)
        is InboxResult.Failure -> promise.reject(result.exception.code(), result.exception.message)
      }
    }
  }

  override fun trackMessageClick(
    messageId: String,
    actionId: String?,
    properties: ReadableMap?,
    promise: Promise,
  ) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }

    // A value that is not Serializable cannot be recorded on the event, so it is left out
    val clickProperties: Map<String, Serializable?> =
      properties
        ?.toHashMap()
        ?.mapNotNull { (key, value) -> (value as? Serializable)?.let { key to it } }
        ?.toMap()
        ?: emptyMap()

    KlaviyoInbox.trackMessageClick(messageId, actionId, clickProperties) { result ->
      when (result) {
        is InboxResult.Success -> promise.resolve(result.value)
        is InboxResult.Failure -> promise.reject(result.exception.code(), result.exception.message)
      }
    }
  }

  override fun updateMessageStates(
    state: String,
    readFilter: String,
    archiveFilter: String,
    promise: Promise,
  ) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }

    // Reject an unrecognized value rather than apply a bulk change to the wrong messages.
    val change =
      toStateChange(state) ?: run {
        promise.reject(
          InboxErrorCode.STORAGE_FAILURE,
          "Unrecognized inbox message state '$state'",
        )
        return
      }
    val read =
      toReadFilter(readFilter) ?: run {
        promise.reject(
          InboxErrorCode.STORAGE_FAILURE,
          "Unrecognized inbox readFilter '$readFilter'",
        )
        return
      }
    val archive =
      toArchiveFilter(archiveFilter) ?: run {
        promise.reject(
          InboxErrorCode.STORAGE_FAILURE,
          "Unrecognized inbox archiveFilter '$archiveFilter'",
        )
        return
      }

    KlaviyoInbox.updateMessageState(change, InboxFilter.where(read, archive)) { result ->
      when (result) {
        is InboxResult.Success -> promise.resolve(result.value)
        is InboxResult.Failure -> promise.reject(result.exception.code(), result.exception.message)
      }
    }
  }

  override fun clearAll(promise: Promise) {
    if (!isAvailable()) {
      promise.reject(InboxErrorCode.UNAVAILABLE, "KlaviyoInbox is not linked into this build")
      return
    }

    KlaviyoInbox.clearAll { result ->
      when (result) {
        is InboxResult.Success -> promise.resolve(result.value)
        is InboxResult.Failure -> promise.reject(result.exception.code(), result.exception.message)
      }
    }
  }

  /** The registered change listener, held so it can be removed. Guarded by [changeLock]. */
  private var changeListener: InboxChangeListener? = null
  private val changeLock = Any()

  /** Starts forwarding inbox change invalidations. */
  override fun registerChangeHandler(onChange: () -> Unit) {
    if (!isAvailable()) return

    synchronized(changeLock) {
      // Replace rather than stack, so a change is not delivered twice.
      changeListener?.let { KlaviyoInbox.removeChangeListener(it) }

      val listener = InboxChangeListener { onChange() }
      changeListener = listener
      KlaviyoInbox.addChangeListener(listener)
    }
  }

  /** Stops forwarding inbox change invalidations. */
  override fun unregisterChangeHandler() {
    synchronized(changeLock) {
      changeListener?.let { KlaviyoInbox.removeChangeListener(it) }
      changeListener = null
    }
  }

  /** Maps a native [InboxException] to a rejection code. */
  private fun InboxException.code(): String =
    when (this) {
      is InboxException.InvalidCursor -> InboxErrorCode.INVALID_CURSOR
      is InboxException.StorageFailure -> InboxErrorCode.STORAGE_FAILURE
    }

  /** Converts a page to the bridge's wire format. The cursor crosses as its token. */
  private fun InboxPage.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
      val messagesArray = Arguments.createArray()
      messages.forEach { messagesArray.pushMap(it.toWritableMap()) }
      putArray("messages", messagesArray)
      nextCursor?.let { putString("nextCursor", it.token) }
    }

  /** Converts a message to the bridge's wire format, with timestamps as epoch milliseconds. */
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
      putDouble("sentAt", sentAt.toDouble())
      putDouble("receivedAt", receivedAt.toDouble())
      // A local copy, since `badge` comes from another module and can't be smart cast.
      val badgeValue = badge
      collapseId?.let { putString("collapseId", it) }
      // A null badge means the push requested no badge change.
      if (badgeValue != null) putInt("badge", badgeValue) else putNull("badge")
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

  /** Maps a state string onto the native [InboxStateChange]. */
  private fun toStateChange(raw: String): InboxStateChange? =
    when (raw) {
      "read" -> InboxStateChange.MARK_READ
      "unread" -> InboxStateChange.MARK_UNREAD
      "archived" -> InboxStateChange.ARCHIVE
      "unarchived" -> InboxStateChange.UNARCHIVE
      else -> null
    }

  /** Maps a read-filter string onto the native [InboxReadFilter]. */
  private fun toReadFilter(raw: String): InboxReadFilter? =
    when (raw) {
      "all" -> InboxReadFilter.ALL
      "unread" -> InboxReadFilter.UNREAD
      "read" -> InboxReadFilter.READ
      else -> null
    }

  /** Maps an archive-filter string onto the native [InboxArchiveFilter]. */
  private fun toArchiveFilter(raw: String): InboxArchiveFilter? =
    when (raw) {
      "active" -> InboxArchiveFilter.ACTIVE
      "archived" -> InboxArchiveFilter.ARCHIVED
      "all" -> InboxArchiveFilter.ALL
      else -> null
    }

  /**
   * Reads one filter value off the options map, or null when the key is absent. A present
   * non-string value is returned as the empty string, so the caller rejects it.
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
