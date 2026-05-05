package com.klaviyoreactnativesdkexample

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

// OPTIONAL: Imports required for the native Klaviyo initialization pattern
// shown in the commented reference block inside onCreate() below. Uncomment
// these alongside the code in onCreate() if you want to initialize the
// Klaviyo SDK and collect the FCM push token from Kotlin instead of JS.
// import com.klaviyo.analytics.Klaviyo
// import com.google.firebase.messaging.FirebaseMessaging

class MainApplication :
  Application(),
  ReactApplication {
  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)

    // OPTIONAL: Native Klaviyo initialization. The example app initializes
    // Klaviyo from JS via .env (see example/src/App.tsx). If you'd rather
    // initialize from Kotlin, uncomment the imports at the top of this file
    // and the block below. See example/README.md for trade-offs.
    //
    // Klaviyo.initialize("YOUR_KLAVIYO_PUBLIC_API_KEY", this)
    // FirebaseMessaging.getInstance().token.addOnSuccessListener {
    //   Klaviyo.setPushToken(it)
    // }
  }
}
