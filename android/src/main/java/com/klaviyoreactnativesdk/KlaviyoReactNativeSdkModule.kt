package com.klaviyoreactnativesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.analytics.model.*
import java.io.Serializable
import kotlin.reflect.KVisibility

class KlaviyoReactNativeSdkModule internal constructor(private val context: ReactApplicationContext) :
  KlaviyoReactNativeSdkSpec(context) {

  override fun getName(): String {
    return NAME
  }

  override fun getConstants(): MutableMap<String, Any> {
    return hashMapOf(
      "PROFILE_KEYS" to this.extractConstants<ProfileKey>(),
      "EVENT_NAMES" to this.extractConstants<EventType>(),
      "EVENT_KEYS" to this.extractConstants<EventKey>(),
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
  override fun createEvent(name: String, properties: ReadableMap?) {
    Klaviyo.initialize("LuYLmF", context)
    val event = Event(
      type = name,
      properties =properties?.toHashMap()?.map { entry -> EventKey.CUSTOM(entry.key) as EventKey to entry.value as Serializable }
        ?.toMap(),
    )
    Klaviyo.createEvent(event = event)
  }

  companion object {
    const val NAME = "KlaviyoReactNativeSdk"
  }
}
