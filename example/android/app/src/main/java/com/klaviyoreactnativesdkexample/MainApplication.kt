package com.klaviyoreactnativesdkexample

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.flipper.ReactNativeFlipper
import com.facebook.soloader.SoLoader
import com.google.firebase.messaging.FirebaseMessaging
import com.klaviyo.analytics.Klaviyo

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> {
        // Packages that cannot be autolinked yet can be added manually here, for example:
        // packages.add(new MyReactNativePackage());
        return PackageList(this).packages
      }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)

    if (BuildConfig.INITIALIZE_KLAVIYO_FROM_NATIVE) {
      // Android Installation Step 3: Initialize the SDK with public key and context, if initializing from native code
      Klaviyo.initialize(BuildConfig.PUBLIC_API_KEY, this)

      if (BuildConfig.USE_NATIVE_FIREBASE) {
        // Android Installation Step 4a: Collect push token and pass it to Klaviyo, if handling push tokens natively
        FirebaseMessaging.getInstance().token.addOnSuccessListener {
          Log.d("KlaviyoSampleApp", "Push token set: $it")
          Klaviyo.setPushToken(it)
        }
      }
    }
  }
}
