package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap

abstract class KlaviyoReactNativeSdkSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {
    abstract fun setProfile(profile: ReadableMap)

    abstract fun setExternalId(externalId: String)

    abstract fun getExternalId(callback: Callback)

    abstract fun setEmail(email: String)

    abstract fun getEmail(callback: Callback)

    abstract fun setPhoneNumber(phoneNumber: String)

    abstract fun getPhoneNumber(callback: Callback)

    abstract fun setProfileAttribute(
      propertyKey: String,
      value: String,
    )

    abstract fun resetProfile()

    abstract fun createEvent(event: ReadableMap)
  }
