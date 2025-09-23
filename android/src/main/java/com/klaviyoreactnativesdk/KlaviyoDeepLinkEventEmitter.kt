package com.klaviyoreactnativesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class KlaviyoDeepLinkEventEmitter(
  private val reactContext: ReactApplicationContext,
) : com.facebook.react.bridge.ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "KlaviyoDeepLinkEventEmitter"
    private const val DEEP_LINK_EVENT = "klaviyoDeepLink"
  }

  override fun getName(): String = NAME

  fun emitDeepLinkEvent(url: String) {
    val params: WritableMap =
      Arguments.createMap().apply {
        putString("url", url)
      }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(DEEP_LINK_EVENT, params)
  }
}
