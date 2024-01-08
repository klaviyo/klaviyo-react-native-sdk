package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.analytics.model.Event
import com.klaviyo.analytics.model.EventKey
import com.klaviyo.analytics.model.EventType
import com.klaviyo.analytics.model.Keyword
import com.klaviyo.analytics.model.Profile
import com.klaviyo.analytics.model.ProfileKey
import java.io.Serializable
import kotlin.reflect.KVisibility

class KlaviyoReactNativeSdkModule internal constructor(private val context: ReactApplicationContext) :
  KlaviyoReactNativeSdkSpec(context) {
    companion object {
      const val NAME = "KlaviyoReactNativeSdk"
    }

    override fun getName(): String {
      return NAME
    }

    override fun getConstants(): MutableMap<String, Any> {
      return hashMapOf(
        "PROFILE_KEYS" to this.extractConstants<ProfileKey>(),
        "EVENT_NAMES" to this.extractConstants<EventType>(),
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
    }

    @ReactMethod
    override fun setEmail(email: String) {
      Klaviyo.setEmail(email)
    }

    @ReactMethod
    override fun setExternalId(externalId: String) {
      Klaviyo.setExternalId(externalId)
    }

    @ReactMethod
    override fun setPhoneNumber(phoneNumber: String) {
      Klaviyo.setPhoneNumber(phoneNumber)
    }

    @ReactMethod
    override fun setPushToken(pushToken: String) {
      Klaviyo.setPushToken(pushToken)
    }

    @ReactMethod
    override fun setProfile(profile: ReadableMap) {
      val parsedProfile =
        profile.toHashMap().map { entry ->
          ProfileKey.CUSTOM(entry.key) as ProfileKey to entry.value as Serializable
        }.toMap()

      Klaviyo.setProfile(Profile(parsedProfile))
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
    override fun getEmail(callback: Callback) {
      callback.invoke(Klaviyo.getEmail())
    }

    @ReactMethod
    override fun getExternalId(callback: Callback) {
      callback.invoke(Klaviyo.getExternalId())
    }

    @ReactMethod
    override fun getPhoneNumber(callback: Callback) {
      callback.invoke(Klaviyo.getPhoneNumber())
    }

    @ReactMethod
    override fun getPushToken(callback: Callback) {
      callback.invoke(Klaviyo.getPushToken())
    }

    @ReactMethod
    override fun createEvent(event: ReadableMap) {
      val klaviyoEvent =
        Event(
          type = event.getString("name")!!.let { EventType.CUSTOM(it) },
          properties =
            event.getMap("properties")?.toHashMap()
              ?.map { entry -> EventKey.CUSTOM(entry.key) as EventKey to entry.value as Serializable }
              ?.toMap(),
        )
      // TODO: Update this after the Android SDK is updated to support setting null property values
      if (event.hasKey("value")) {
        klaviyoEvent.setProperty(EventKey.VALUE, event.getDouble("value"))
      }
      Klaviyo.createEvent(event = klaviyoEvent)
    }
  }
