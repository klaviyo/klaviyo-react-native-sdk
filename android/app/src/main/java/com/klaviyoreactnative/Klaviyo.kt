package com.klaviyoreactnative


import android.media.tv.TvContract.Programs
import android.util.Log
import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableMapKeySetIterator
import com.facebook.react.bridge.ReadableType
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager
import com.klaviyo.analytics.Klaviyo
import com.klaviyo.analytics.model.Event
import com.klaviyo.analytics.model.EventKey
import com.klaviyo.analytics.model.EventType
import com.klaviyo.analytics.model.Profile
import com.klaviyo.analytics.model.ProfileKey
import java.io.Serializable

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

    //region Setters

    @ReactMethod
    fun helloWorld() {
        Log.d("Klaviyo", "Hello world")
    }

    @ReactMethod
    fun setProfile(
    email: String? = null,
    phoneNumber: String? = null,
    externalId: String? = null,
    firstName: String? = null,
    lastName: String? = null,
    organization: String? = null,
    title: String? = null,
    image: String? = null,
    address1: String? = null,
    address2: String? = null,
    city: String? = null,
    country: String? = null,
    latitude: Int? = null,
    longitude: Int? = null,
    region: String? = null,
    zip: String? = null,
    timezone: String? = null,
    properties: ReadableMap? = null
    ) {
// TODO: add properties to profile
//        val propertiesMap = mapOf<String, Any>()
//
//        val properties = properties?.let { it } ?: return
//
//        val iterator: ReadableMapKeySetIterator = properties!!.keySetIterator()
//
//        while (iterator.hasNextKey()) {
//            val key = iterator.nextKey()
//            val value = properties.getType(key)
//
//            // Check the type of the value and handle it accordingly
//            when (value) {
//                ReadableType.String -> {
//                    val stringValue = properties.getString(key)
//                    // Handle the string value
//                }
//                ReadableType.Number -> {
//                    val numberValue = properties.getDouble(key)
//                    // Handle the number value
//                }
//                // Add more cases for other types as needed
//                else -> {
//                    // Handle other types or provide a default case
//                }
//            }
//
//            // Print the key and value (replace with your handling logic)
//            println("Key: $key, Value: $value")
//
//            propertiesMap.apply { ProfileKey.CUSTOM(key) to value }
//        }

        val profileMap = mapOf(
            ProfileKey.EMAIL to email,
            ProfileKey.PHONE_NUMBER to phoneNumber,
            ProfileKey.EXTERNAL_ID to externalId,
            ProfileKey.FIRST_NAME to firstName,
            ProfileKey.LAST_NAME to lastName,
            ProfileKey.ORGANIZATION to organization,
            ProfileKey.TITLE to title,
            ProfileKey.IMAGE to image,
            ProfileKey.ADDRESS1 to address1,
            ProfileKey.ADDRESS2 to address2,
            ProfileKey.CITY to city,
            ProfileKey.LATITUDE to latitude,
            ProfileKey.LONGITUDE to longitude,
            ProfileKey.REGION to region,
            ProfileKey.ZIP to zip,
            ProfileKey.TIMEZONE to timezone,
        )
        val filteredProfileMap = profileMap
            .filterValues { it != null }
            .mapValues { it.value as Serializable }
            .toMutableMap()

        val profile = Profile(
            filteredProfileMap
        )
        Klaviyo.setProfile(profile)

        Log.d("Klaviyo", "setProfile: $profile")
    }

    @ReactMethod
    fun setEmail(value: String) {
        Log.d("Klaviyo", "setting email = $value")
        Klaviyo.setEmail(value)
    }

    @ReactMethod
    fun setPhoneNumber(value: String) {
        Log.d("Klaviyo", "setting phone number = $value")
        Klaviyo.setPhoneNumber(value)
    }

    @ReactMethod
    fun setExternalId(value: String) {
        Log.d("Klaviyo", "setting external id = $value")
        Klaviyo.setExternalId(value)
    }

    @ReactMethod
    fun resetProfile() {
        Log.d("Klaviyo", "resetting profile")
        Klaviyo.resetProfile()
    }

    @ReactMethod
    fun sendTestEvent() {
        Log.d("Klaviyo", "Sending test event")
        Klaviyo.createEvent(EventType.CUSTOM("Test Event"))
    }

    //endregion


    //region Getters

    @ReactMethod
    fun getEmail(callback: Callback) {
        callback.invoke(Klaviyo.getEmail() ?: "")
    }

    @ReactMethod
    fun getPhoneNumber(callback: Callback) {
        callback.invoke(Klaviyo.getPhoneNumber() ?: "")
    }

    @ReactMethod
    fun getExternalId(callback: Callback) {
        callback.invoke(Klaviyo.getExternalId() ?: "")
    }

    @ReactMethod
    fun getPushToken(callback: Callback) {
        callback.invoke(Klaviyo.getPushToken() ?: "")
    }

    //endregion
    companion object {
        const val EVENT_ADD_SUCCESS = "event_add_success"
    }
}