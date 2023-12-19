package com.klaviyoreactnativesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.analytics.model.Event
import com.klaviyo.analytics.model.EventKey
import java.io.Serializable

class KlaviyoReactNativeSdkModule internal constructor(private val context: ReactApplicationContext) :
  KlaviyoReactNativeSdkSpec(context) {

  override fun getName(): String {
    return NAME
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  @ReactMethod
  override fun multiply(a: Double, b: Double, promise: Promise) {
    promise.resolve(a * b)
  }

  @ReactMethod
  override fun createEvent(event: ReadableMap) {
    println(event)
    Klaviyo.initialize("LuYLmF", context)
    Klaviyo.createEvent(Event(
      type = event.getMap("event")!!.getString("name")!!,
      properties = (event.getMap("properties") as Map<String, Serializable>).map { entry -> EventKey.CUSTOM(entry.key) to entry.value }.toMap(),
    ))
  }

  companion object {
    const val NAME = "KlaviyoReactNativeSdk"
  }
}
