package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap

abstract class KlaviyoReactNativeSdkSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  abstract fun initialize(apiKey: String)

  abstract fun setEmail(email: String)
  abstract fun setExternalId(externalId: String)
  abstract fun setPhoneNumber(phoneNumber: String)
  abstract fun setPushToken(pushToken: String)
  abstract fun setProfile(profile: ReadableMap)
  abstract fun setProfileAttribute(propertyKey: String, value: String)

  abstract fun resetProfile()

  abstract fun getEmail(callback: Callback)
  abstract fun getExternalId(callback: Callback)
  abstract fun getPhoneNumber(callback: Callback)
  abstract fun getPushToken(callback: Callback)

  abstract fun createEvent(name: String, properties: ReadableMap?)
}
