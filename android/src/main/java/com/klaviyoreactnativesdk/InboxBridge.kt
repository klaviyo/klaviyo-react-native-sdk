package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.klaviyo.core.Registry

/**
 * Indirection between the React module and the Mobile Inbox implementation.
 *
 * React Native's classic bridge only discovers `@ReactMethod`s declared on the concrete module
 * class, so the inbox methods are declared in `KlaviyoReactNativeSdkModule` either way. This
 * interface keeps those declarations free of any `com.klaviyo.inbox` type, so they compile whether
 * or not the inbox module is included. The implementation lives in `android/src/inbox/java`.
 */
internal interface InboxBridge {
  /** Whether the native inbox module is present and usable in this build. */
  fun isAvailable(): Boolean

  fun fetchPage(
    options: ReadableMap?,
    promise: Promise,
  )

  fun fetchUnreadCount(promise: Promise)

  fun updateMessageState(
    messageId: String,
    state: String,
    promise: Promise,
  )

  /** Starts delivering inbox change invalidations. Registering again replaces the subscription. */
  fun registerChangeHandler(onChange: () -> Unit)

  /** Stops delivering inbox change invalidations. */
  fun unregisterChangeHandler()
}

/**
 * Locates the [InboxBridge] implementation, if this build has one. It is loaded by name so a
 * default build, which compiles no implementation, still links. [bridge] is null when it is absent.
 */
internal object InboxBridgeProvider {
  private const val IMPLEMENTATION_CLASS = "com.klaviyoreactnativesdk.InboxBridgeImpl"

  /** The implementation for this build, or null when the inbox module is not included. */
  val bridge: InboxBridge? by lazy { loadBridge() }

  private fun loadBridge(): InboxBridge? =
    try {
      Class
        .forName(IMPLEMENTATION_CLASS)
        .getDeclaredConstructor()
        .newInstance() as InboxBridge
    } catch (e: ClassNotFoundException) {
      // Expected in a default build.
      null
    } catch (e: ReflectiveOperationException) {
      Registry.log.error("Unable to load the Mobile Inbox bridge implementation", e)
      null
    }
}
