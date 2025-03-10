package com.klaviyoreactnativesdk

import android.util.Log
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.forms.registerForInAppForms
import com.facebook.react.bridge.UiThreadUtil

class KlaviyoFormsReactNativeSdkModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "KlaviyoFormsReactNativeSdk"
  }

  override fun getName(): String = NAME

  override fun getConstants(): MutableMap<String, Any> = mutableMapOf()

  @ReactMethod
  fun registerForInAppForms() {
    UiThreadUtil.runOnUiThread {
      try {
        Klaviyo.registerForInAppForms()
      } catch (e: Exception) {
        Log.d("KlaviyoReactNativeSdk", "Android unable to register for in app forms on main thread: ${e.message}")
      }
    }
  }


}