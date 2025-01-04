package com.klaviyoreactnativesdk.ui

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil.runOnUiThread
import com.klaviyo.messaging.InAppMessaging

class KlaviyoUIReactNativeModule internal constructor(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {
  companion object {
    const val NAME = "KlaviyoUIBridge"
  }

  override fun getName(): String {
    return NAME
  }
}
