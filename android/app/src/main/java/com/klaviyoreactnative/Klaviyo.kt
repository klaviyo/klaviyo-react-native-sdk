package com.klaviyoreactnative


import android.util.Log
import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

class KlaviyoPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> {
        return mutableListOf(Klaviyo(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<ViewManager<View, ReactShadowNode<*>>> {
        return mutableListOf()
    }
}

class Klaviyo(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "Klaviyo"

    override fun getConstants() = mapOf(
        "EVENT_ADD_SUCCESS" to EVENT_ADD_SUCCESS
    )

    @ReactMethod
    fun helloWorld() {
        Log.d("Klaviyo", "Hello world")
    }

    companion object {
        const val EVENT_ADD_SUCCESS = "event_add_success"
    }
}