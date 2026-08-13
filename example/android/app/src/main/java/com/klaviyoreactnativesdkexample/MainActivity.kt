package com.klaviyoreactnativesdkexample

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

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
    super.onCreate(savedInstanceState)

    // AUTOMATIC INTEGRATION VARIANT: com.klaviyo.push.automatic_push_open_tracking is
    // enabled (see AndroidManifest.xml), so the SDK detects notification taps and
    // reports the open for you — no Klaviyo.handlePush(intent) call needed here.
    onNewIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)

    // Android Installation Step: Call handlePush when a push notification is tapped
    // Note: due to platform differences, this step must be implemented in native code.
    // Tapping on a notification broadcasts an intent to your app. This method detects if the
    // intent originated from a Klaviyo push notification and registers a special Opened Push event
    // Klaviyo.handlePush(intent) // handled automatically by the native SDK
  }
}
