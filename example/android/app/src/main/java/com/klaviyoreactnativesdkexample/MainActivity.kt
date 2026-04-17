package com.klaviyoreactnativesdkexample

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.klaviyo.analytics.Klaviyo

class MainActivity : ReactActivity() {
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "KlaviyoReactNativeSdkExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate = DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    Log.v("KlaviyoSampleApp", "MainActivity.onCreate()")
    super.onCreate(savedInstanceState)

    // Android Installation Step: Depending on the state of your application when the notification is tapped,
    // the intent have started this activity, or it might be received via onNewIntent if the app was already running.
    // We recommend passing all intents through Klaviyo.handlePush to make sure you don't miss a use case.
    onNewIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    Log.v("KlaviyoSampleApp", "MainActivity.onNewIntent()")
    Log.v("KlaviyoSampleApp", "Launch Intent: " + intent.toString())
    super.onNewIntent(intent)

    // Android Installation Step: Call handlePush when a push notification is tapped
    // Note: due to platform differences, this step must be implemented in native code.
    // Tapping on a notification broadcasts an intent to your app. This method detects if the
    // intent originated from a Klaviyo push notification and registers a special Opened Push event
    Klaviyo.handlePush(intent)
  }
}
