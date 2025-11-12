package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.UiThreadUtil
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.analytics.model.Event
import com.klaviyo.analytics.model.EventKey
import com.klaviyo.analytics.model.EventMetric
import com.klaviyo.analytics.model.Keyword
import com.klaviyo.analytics.model.Profile
import com.klaviyo.analytics.model.ProfileKey
import com.klaviyo.core.Registry
import com.klaviyo.core.config.Config
import com.klaviyo.core.utils.AdvancedAPI
import com.klaviyo.forms.InAppFormsConfig
import com.klaviyo.forms.registerForInAppForms
import com.klaviyo.forms.unregisterFromInAppForms
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
      } catch (e: Exception) {
        Registry.log.error("Android unable to register for in app forms on main thread", e)
      }
    }
  }

  @ReactMethod
  fun unregisterFromInAppForms() {
    UiThreadUtil.runOnUiThread {
      Klaviyo.unregisterFromInAppForms()
    }
  }

  @ReactMethod
  fun registerGeofencing() {
    Klaviyo.registerGeofencing()
  }

  @ReactMethod
  fun unregisterGeofencing() {
    Klaviyo.unregisterGeofencing()
  }

  @ReactMethod
  fun setProfile(profile: ReadableMap) {
    val parsedProfile = Profile()

    profile.toHashMap().iterator().forEach { (key, value) ->
      when (key) {
        LOCATION, PROPERTIES ->
          (value as? HashMap<*, *>)?.forEach { (key, value) ->
            if (key is String && value is Serializable) {
              parsedProfile[key] = value
            }
          }

        else ->
          if (value is Serializable) {
            parsedProfile[key] = value
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
}
