package com.klaviyoreactnativesdk

import android.app.Application
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.analytics.model.Event
import com.klaviyo.analytics.model.EventKey
import com.klaviyo.analytics.model.EventMetric
import com.klaviyo.analytics.model.Keyword
import com.klaviyo.analytics.model.Profile
import com.klaviyo.analytics.model.ProfileKey
import java.io.Serializable
import kotlin.reflect.KVisibility

class KlaviyoReactNativeSdkModule internal constructor(private val context: ReactApplicationContext) :
  KlaviyoReactNativeSdkSpec(context) {
    companion object {
      const val NAME = "KlaviyoReactNativeSdk"
      private const val LOCATION = "location"
      private const val PROPERTIES = "properties"
    }

    override fun getName(): String {
      return NAME
    }

    override fun getConstants(): MutableMap<String, Any> {
      return hashMapOf(
        "PROFILE_KEYS" to
          this.extractConstants<ProfileKey>().toMutableMap().apply {
            this[LOCATION] = LOCATION
            this[PROPERTIES] = PROPERTIES
          },
        "EVENT_NAMES" to this.extractConstants<EventMetric>(),
      )
    }

    private inline fun <reified T> extractConstants(): Map<String, String> where T : Keyword {
      return T::class.nestedClasses.filter {
        it.visibility == KVisibility.PUBLIC && it.objectInstance != null
      }.associate {
        it.simpleName.toString() to (it.objectInstance as T).name
      }
    }

    @ReactMethod
    override fun initialize(apiKey: String) {
      Klaviyo.initialize(apiKey, context)

      // Attach the Klaviyo lifecycle callbacks to the application if initialize
      // is invoked from the react-native layer.
      val application = context.applicationContext as? Application

      if (application != null) {
        application.unregisterActivityLifecycleCallbacks(Klaviyo.lifecycleCallbacks)
        application.registerActivityLifecycleCallbacks(Klaviyo.lifecycleCallbacks)
      } else {
        println("KlaviyoReactNativeSdkModule: Could not register lifecycle callbacks.")
      }
    }

    @ReactMethod
    override fun setProfile(profile: ReadableMap) {
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
    override fun setExternalId(externalId: String) {
      Klaviyo.setExternalId(externalId)
    }

    @ReactMethod
    override fun getExternalId(callback: Callback) {
      callback.invoke(Klaviyo.getExternalId())
    }

    @ReactMethod
    override fun setEmail(email: String) {
      Klaviyo.setEmail(email)
    }

    @ReactMethod
    override fun getEmail(callback: Callback) {
      callback.invoke(Klaviyo.getEmail())
    }

    @ReactMethod
    override fun setPhoneNumber(phoneNumber: String) {
      Klaviyo.setPhoneNumber(phoneNumber)
    }

    @ReactMethod
    override fun getPhoneNumber(callback: Callback) {
      callback.invoke(Klaviyo.getPhoneNumber())
    }

    @ReactMethod
    override fun setProfileAttribute(
      propertyKey: String,
      value: String,
    ) {
      Klaviyo.setProfileAttribute(ProfileKey.CUSTOM(propertyKey), value)
    }

    @ReactMethod
    override fun resetProfile() {
      Klaviyo.resetProfile()
    }

    @ReactMethod
    override fun setPushToken(token: String) {
      Klaviyo.setPushToken(token)
    }

    @ReactMethod
    override fun getPushToken(callback: Callback) {
      callback.invoke(Klaviyo.getPushToken())
    }

    @ReactMethod
    override fun createEvent(event: ReadableMap) {
      val klaviyoEvent =
        Event(
          metric = event.getString("name")!!.let { EventMetric.CUSTOM(it) },
          properties =
            event.getMap("properties")?.toHashMap()
              ?.map { entry -> EventKey.CUSTOM(entry.key) as EventKey to entry.value as Serializable }
              ?.toMap(),
        )

      val value = if (event.hasKey("value")) event.getDouble("value") else null

      if (value != null) {
        klaviyoEvent.setValue(value)
      }

      Klaviyo.createEvent(event = klaviyoEvent)
    }
  }
