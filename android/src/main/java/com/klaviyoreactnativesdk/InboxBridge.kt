package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

/**
 * Indirection between the React module and the Mobile Inbox bridge implementation.
 *
 * The inbox artifacts are opt-in and are not on the classpath in a default build, but React
 * Native's classic bridge only discovers `@ReactMethod`s declared on the concrete module class
 * (`JavaModuleWrapper.findMethods` reads `declaredMethods`), so the inbox methods have to be
 * declared in `KlaviyoReactNativeSdkModule` either way. This interface keeps those declarations
 * free of any `com.klaviyo.inbox` type, so they compile whether or not the inbox module is
 * included.
 *
 * The implementation lives in `android/src/inbox/java`, which `android/build.gradle` only adds to
 * the source set when `klaviyoIncludeInbox=true`. Packaging the inbox dependency properly — the
 * same way Forms and Location are packaged — is a later pass; at that point this indirection can
 * be dropped and the implementation inlined here.
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

  /**
   * Starts delivering inbox change invalidations.
   *
   * [onChange] is invoked on the JS bridge's thread whenever the inbox may have changed. It must
   * emit with no payload: the event is an invalidation, not a diff. Registering while already
   * registered replaces the existing subscription rather than adding a second one.
   */
  fun registerChangeHandler(onChange: () -> Unit)

  /** Stops delivering inbox change invalidations and cancels the collection. */
  fun unregisterChangeHandler()
}

/**
 * Locates the [InboxBridge] implementation, if this build has one.
 *
 * The implementation is loaded by name rather than referenced directly so that a default build —
 * which has no inbox artifacts and compiles no implementation — still links. When the class is
 * absent, [bridge] is null and every inbox call rejects with `INBOX_UNAVAILABLE`, which is the
 * documented contract for a build without the module.
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
      // Expected in a default build: the implementation is compiled only when
      // klaviyoIncludeInbox=true.
      null
    } catch (e: ReflectiveOperationException) {
      com.klaviyo.core.Registry.log
        .error("Unable to load the Mobile Inbox bridge implementation", e)
      null
    }
}
