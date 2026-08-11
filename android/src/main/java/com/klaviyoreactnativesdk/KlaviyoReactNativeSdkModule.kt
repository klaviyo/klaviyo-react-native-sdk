package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.analytics.model.Event
import com.klaviyo.analytics.model.EventKey
import com.klaviyo.analytics.model.EventMetric
import com.klaviyo.analytics.model.Keyword
import com.klaviyo.analytics.model.Profile
import com.klaviyo.analytics.model.ProfileKey
import com.klaviyo.analytics.model.Subscription
import com.klaviyo.core.MissingKlaviyoModule
import com.klaviyo.core.Registry
import com.klaviyo.core.config.Config
import com.klaviyo.core.utils.AdvancedAPI
import com.klaviyo.forms.FormLifecycleEvent
import com.klaviyo.forms.FormsProvider
import com.klaviyo.forms.InAppFormsConfig
import com.klaviyo.forms.registerForInAppForms
import com.klaviyo.forms.registerFormLifecycleHandler
import com.klaviyo.forms.unregisterFormLifecycleHandler
import com.klaviyo.forms.unregisterFromInAppForms
import com.klaviyo.location.GeofencingProvider
import com.klaviyo.location.LocationManager
import com.klaviyo.location.registerGeofencing
import com.klaviyo.location.unregisterGeofencing
import java.io.Serializable
import kotlin.reflect.KVisibility
import kotlin.time.Duration.Companion.seconds

class KlaviyoReactNativeSdkModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "KlaviyoReactNativeSdk"
    private const val LOCATION = "location"
    private const val PROPERTIES = "properties"
    private const val LIST_ID = "listId"
    private const val CUSTOM_SOURCE = "customSource"
    private const val CHANNELS = "channels"
    private const val EMAIL = "email"
    private const val SMS = "sms"
    private const val WHATSAPP = "whatsapp"
  }

  private fun sendEvent(
    eventName: String,
    params: WritableMap?,
  ) {
    // Form lifecycle callbacks fire from the native SDK and can race the
    // host Activity/Process being torn down (background → low-memory kill,
    // config change, deep-link launch from CTA, dev-mode HMR/fast-refresh).
    // `getJSModule` throws `RuntimeException: Catalyst Instance has already
    // disappeared` in that window, so guard the call. Pattern mirrors RN's
    // own AppStateModule.sendEvent fix.
    // Using `hasActiveCatalystInstance` (deprecated alias of
    // `hasActiveReactInstance`) for broader peer-dep range — the SDK's
    // peerDependencies allow any react-native version.
    if (!reactContext.hasActiveCatalystInstance()) return
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    } catch (e: Exception) {
      // TOCTOU race: catalyst instance was alive at the check above but is
      // being torn down by the time we call. Drop the event quietly.
      Registry.log.error("Failed to emit $eventName: catalyst instance unavailable", e)
    }
  }

  override fun getName(): String = NAME

  override fun getConstants(): MutableMap<String, Any> =
    hashMapOf(
      "PROFILE_KEYS" to
        this.extractConstants<ProfileKey>().toMutableMap().apply {
          this[LOCATION] = LOCATION
          this[PROPERTIES] = PROPERTIES
        },
      "EVENT_NAMES" to this.extractConstants<EventMetric>(),
      "FORMS_AVAILABLE" to Registry.isRegistered<FormsProvider>(),
      "LOCATION_AVAILABLE" to Registry.isRegistered<GeofencingProvider>(),
    )

  private inline fun <reified T> extractConstants(): Map<String, String> where T : Keyword =
    T::class
      .nestedClasses
      .filter {
        it.visibility == KVisibility.PUBLIC && it.objectInstance is T
      }.associate {
        it.simpleName.toString() to (it.objectInstance as T).name
      }

  @ReactMethod
  @OptIn(AdvancedAPI::class)
  fun initialize(apiKey: String) {
    // Since initialize is being called after Application.onCreate,
    // we must hand over a reference to the current activity.
    // The native SDK will track Activity changes internally from here on.
    reactApplicationContext.currentActivity?.let(Registry.lifecycleMonitor::assignCurrentActivity)
    Klaviyo.initialize(apiKey, reactContext)
  }

  @ReactMethod
  fun registerForInAppForms(configuration: ReadableMap?) {
    UiThreadUtil.runOnUiThread {
      try {
        val timeout = configuration?.getDouble("sessionTimeoutDuration")?.seconds
        Klaviyo.registerForInAppForms(
          InAppFormsConfig(
            sessionTimeoutDuration = timeout ?: InAppFormsConfig.DEFAULT_SESSION_TIMEOUT,
          ),
        )
      } catch (e: MissingKlaviyoModule) {
        Registry.log.error("Forms module is not available", e)
      } catch (e: Exception) {
        Registry.log.error("Android unable to register for in app forms on main thread", e)
      }
    }
  }

  @ReactMethod
  fun unregisterFromInAppForms() {
    UiThreadUtil.runOnUiThread {
      try {
        Klaviyo.unregisterFromInAppForms()
      } catch (e: MissingKlaviyoModule) {
        Registry.log.error("Forms module is not available", e)
      }
    }
  }

  @ReactMethod
  fun registerGeofencing() {
    try {
      Klaviyo.registerGeofencing()
    } catch (e: MissingKlaviyoModule) {
      Registry.log.error("Location module is not available", e)
    }
  }

  @ReactMethod
  fun unregisterGeofencing() {
    try {
      Klaviyo.unregisterGeofencing()
    } catch (e: MissingKlaviyoModule) {
      Registry.log.error("Location module is not available", e)
    }
  }

  @ReactMethod
  fun getCurrentGeofences(callback: Callback) {
    // Note: in the future, we may be storing more fences than we are observing, so we'd have to update this
    val geofencesArray = Arguments.createArray()
    Registry.getOrNull<LocationManager>()?.getStoredGeofences()?.forEach { geofence ->
      geofencesArray.pushMap(
        Arguments.createMap().apply {
          putString("identifier", geofence.id)
          putDouble("latitude", geofence.latitude)
          putDouble("longitude", geofence.longitude)
          putDouble("radius", geofence.radius.toDouble())
        },
      )
    } ?: run {
      Registry.log.wtf("Geofencing is not yet registered")
    }

    val resultMap =
      Arguments.createMap().apply {
        putArray("geofences", geofencesArray)
      }

    callback.invoke(resultMap)
  }

  @ReactMethod
  fun setProfile(profile: ReadableMap) {
    val parsedProfile = Profile()

    profile.toHashMap().iterator().forEach { (key, value) ->
      when (key) {
        LOCATION, PROPERTIES -> {
          (value as? HashMap<*, *>)?.forEach { (key, value) ->
            if (key is String && value is Serializable) {
              parsedProfile[key] = value
            }
          }
        }

        else -> {
          if (value is Serializable) {
            parsedProfile[key] = value
          }
        }
      }
    }

    Klaviyo.setProfile(parsedProfile)
  }

  @ReactMethod
  fun setExternalId(externalId: String) {
    Klaviyo.setExternalId(externalId)
  }

  @ReactMethod
  fun getExternalId(callback: Callback) {
    callback.invoke(Klaviyo.getExternalId())
  }

  @ReactMethod
  fun setEmail(email: String) {
    Klaviyo.setEmail(email)
  }

  @ReactMethod
  fun getEmail(callback: Callback) {
    callback.invoke(Klaviyo.getEmail())
  }

  @ReactMethod
  fun setPhoneNumber(phoneNumber: String) {
    Klaviyo.setPhoneNumber(phoneNumber)
  }

  @ReactMethod
  fun getPhoneNumber(callback: Callback) {
    callback.invoke(Klaviyo.getPhoneNumber())
  }

  @ReactMethod
  fun setProfileAttribute(
    propertyKey: String,
    value: String,
  ) {
    Klaviyo.setProfileAttribute(ProfileKey.CUSTOM(propertyKey), value)
  }

  @ReactMethod
  fun resetProfile() {
    Klaviyo.resetProfile()
  }

  @ReactMethod
  fun setPushToken(token: String) {
    Klaviyo.setPushToken(token)
  }

  @ReactMethod
  fun getPushToken(callback: Callback) {
    callback.invoke(Klaviyo.getPushToken())
  }

  @ReactMethod
  fun handleUniversalTrackingLink(urlStr: String) {
    Registry.log.debug("[Klaviyo React Native SDK] handleUniversalTrackingLink called with url string: $urlStr")

    if (urlStr.isEmpty()) {
      Registry.log.warning("[Klaviyo React Native SDK] Empty tracking link provided")
      return
    }

    if (!Registry.isRegistered<Config>()) {
      // If the SDK has not been initialized yet, we cannot handle the link without providing Context to Klaviyo SDK
      reactApplicationContext.currentActivity?.let {
        Klaviyo.registerForLifecycleCallbacks(it)
      }
    }

    Klaviyo.handleUniversalTrackingLink(urlStr)
  }

  @ReactMethod
  fun createEvent(event: ReadableMap) {
    val metric =
      event
        .takeIf {
          it.hasKey("name") && it.getType("name") == ReadableType.String
        }?.getString("name") ?: run {
        Registry.log.error("Klaviyo React Native SDK: Event name is required")
        return
      }

    val klaviyoEvent =
      Event(
        metric = metric.let { EventMetric.CUSTOM(it) },
        properties =
          event
            .getMap("properties")
            ?.toHashMap()
            ?.filter { entry -> (entry.value as? Serializable) != null }
            ?.map { entry -> EventKey.CUSTOM(entry.key) to entry.value as Serializable }
            ?.toMap(),
      )

    event
      .takeIf {
        it.hasKey("uniqueId") && it.getType("uniqueId") == ReadableType.String
      }?.getString("uniqueId")
      ?.let { uniqueId ->
        klaviyoEvent.uniqueId = uniqueId
      }

    // Explicitly cast value to double if it exists
    try {
      event
        .takeIf { it.hasKey("value") && it.getType("value") == ReadableType.Number }
        ?.getDouble("value")
        .let { value ->
          klaviyoEvent.setValue(value)
        }
    } catch (e: Exception) {
      Registry.log.error("Klaviyo React Native SDK: Error setting event value", e)
      return
    }

    Klaviyo.createEvent(event = klaviyoEvent)
  }

  @ReactMethod
  fun createSubscription(subscription: ReadableMap) {
    val listId =
      subscription
        .takeIf {
          it.hasKey(LIST_ID) && it.getType(LIST_ID) == ReadableType.String
        }?.getString(LIST_ID)
        ?.takeIf { it.isNotBlank() } ?: run {
        Registry.log.error("Klaviyo React Native SDK: Subscription listId is required")
        return
      }

    val customSource =
      subscription
        .takeIf {
          it.hasKey(CUSTOM_SOURCE) && it.getType(CUSTOM_SOURCE) == ReadableType.String
        }?.getString(CUSTOM_SOURCE)

    // Only a *missing* channels key means "all available marketing" — the broad grant is reachable
    // solely through the named factory on this SDK and the JS layer. A key that is present but not
    // an object is malformed, and is rejected rather than quietly widening consent.
    val channelsMap =
      if (subscription.hasKey(CHANNELS)) {
        subscription.takeIf { it.getType(CHANNELS) == ReadableType.Map }?.getMap(CHANNELS) ?: run {
          Registry.log.error(
            "Klaviyo React Native SDK: Subscription channels must be an object when present",
          )
          return
        }
      } else {
        null
      }

    val parsed = channelsMap?.let { parseSubscriptionChannels(it) }

    Klaviyo.createSubscription(
      if (parsed == null) {
        Subscription.allAvailableMarketing(listId, customSource)
      } else {
        Subscription(listId, parsed, customSource)
      },
    )
  }

  /**
   * Maps the JS channels payload onto [Subscription.Channels]. An absent channel stays null (leave
   * it untouched); an empty array stays empty, so the native SDK's own validation reports it rather
   * than this bridge silently dropping the channel.
   */
  private fun parseSubscriptionChannels(channels: ReadableMap): Subscription.Channels =
    Subscription.Channels(
      email = channels.parseConsentSet(EMAIL) { Subscription.Channels.Email.valueOf(it) },
      sms = channels.parseConsentSet(SMS) { Subscription.Channels.Messaging.valueOf(it) },
      whatsapp = channels.parseConsentSet(WHATSAPP) { Subscription.Channels.Messaging.valueOf(it) },
    )

  /**
   * Reads one channel's consent array off the JS payload, or null when the key is absent.
   *
   * The JS wire values are the lowercased enum names, so [valueOf] covers the mapping. An
   * unrecognized value is warned about and skipped rather than failing the whole request: skipping
   * only ever narrows the consent granted, and it keeps a newer JS layer from breaking against an
   * older native SDK. iOS skips unknown values the same way.
   */
  private fun <T : Enum<T>> ReadableMap.parseConsentSet(
    key: String,
    valueOf: (String) -> T,
  ): Set<T>? =
    takeIf { it.hasKey(key) && it.getType(key) == ReadableType.Array }
      ?.getArray(key)
      ?.toArrayList()
      ?.mapNotNull { it as? String }
      ?.mapNotNull { rawValue ->
        runCatching { valueOf(rawValue.uppercase()) }.getOrElse {
          Registry.log.warning(
            "Klaviyo React Native SDK: Ignoring unrecognized $key consent type '$rawValue'",
          )
          null
        }
      }?.toSet()

  @ReactMethod
  fun registerFormLifecycleHandler() {
    UiThreadUtil.runOnUiThread {
      try {
        Klaviyo.registerFormLifecycleHandler { event ->
          val params =
            Arguments.createMap().apply {
              putString("formId", event.formId)
              putString("formName", event.formName)
              when (event) {
                is FormLifecycleEvent.FormShown -> {
                  putString("type", "formShown")
                }

                is FormLifecycleEvent.FormDismissed -> {
                  putString("type", "formDismissed")
                }

                is FormLifecycleEvent.FormCtaClicked -> {
                  putString("type", "formCtaClicked")
                  putString("buttonLabel", event.buttonLabel)
                  putString("deepLinkUrl", event.deepLinkUrl.toString())
                }
              }
            }

          sendEvent("FormLifecycleEvent", params)
        }
      } catch (e: MissingKlaviyoModule) {
        Registry.log.error("Forms module is not available", e)
      }
    }
  }

  @ReactMethod
  fun unregisterFormLifecycleHandler() {
    UiThreadUtil.runOnUiThread {
      try {
        Klaviyo.unregisterFormLifecycleHandler()
      } catch (e: MissingKlaviyoModule) {
        Registry.log.error("Forms module is not available", e)
      }
    }
  }

  // Required by NativeEventEmitter on the JS side
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}
}
