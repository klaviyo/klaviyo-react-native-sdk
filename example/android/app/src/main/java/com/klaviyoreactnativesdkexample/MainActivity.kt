package com.klaviyoreactnativesdkexample

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.google.firebase.messaging.FirebaseMessaging
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

  /**
   * Launches a permission request, and receives the result in the callback below
   */
  private var requestPermissionLauncher: ActivityResultLauncher<String> =
    registerForActivityResult(
      ActivityResultContracts.RequestPermission(),
    ) { isGranted: Boolean ->
      // This is called with the result of the permission request
      val verb = if (isGranted) "granted" else "denied"
      Log.d("KlaviyoSampleApp", "Notification permission $verb")

      // Android Installation Step 4c: After permission is granted, call setPushToken to update permission state
      if (isGranted) {
        if (BuildConfig.USE_NATIVE_FIREBASE) {
          FirebaseMessaging.getInstance().token.addOnSuccessListener {
            Log.d("KlaviyoSampleApp", "Push token set: $it")
            Klaviyo.setPushToken(it)
            Toast
              .makeText(
                this,
                "Permission granted! Push token set.",
                Toast.LENGTH_SHORT,
              ).show()
          }
        } else {
          Toast
            .makeText(
              this,
              "Permission granted! Push token not set, because Firebase is not initialized natively.",
              Toast.LENGTH_SHORT,
            ).show()
        }
      } else {
        Toast
          .makeText(
            this,
            "Permission denied",
            Toast.LENGTH_SHORT,
          ).show()
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    Log.v("KlaviyoSampleApp", "MainActivity.onCreate()")
    super.onCreate(savedInstanceState)

    // Android Installation Step 4b: Request notification permission from the user, if handling push tokens natively
    if (BuildConfig.INITIALIZE_KLAVIYO_FROM_NATIVE) {
      // Note: it is not usually advised to prompt for permissions immediately upon app launch. This is just a sample.
      when {
        NotificationManagerCompat.from(this).areNotificationsEnabled() -> {
          // We have already notification permission
          Log.v("KlaviyoSampleApp", "Notification permission is granted")
        }

        ActivityCompat.shouldShowRequestPermissionRationale(
          this,
          Manifest.permission.POST_NOTIFICATIONS,
        ) -> {
          // Reachable on API level >= 33
          // If a permission prompt was previously denied, display an educational UI and request permission again
          Log.v("KlaviyoSampleApp", "Requesting notification permission with rationale")
          requestPermissionWithRationale()
        }

        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
          // Reachable on API Level >= 33
          // We can request the permission
          Log.v("KlaviyoSampleApp", "Requesting notification permission")
          requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        else -> {
          // Reachable on API Level < 33
          // DENIED - Notifications were turned off by the user in system settings
          Log.v("KlaviyoSampleApp", "Notification permission is denied and won't be requested")
          alertPermissionDenied()
        }
      }
    }

    // Android Installation Step 5a: Depending on the state of your application when the notification is tapped,
    // the intent have started this activity, or it might be received via onNewIntent if the app was already running.
    // We recommend passing all intents through Klaviyo.handlePush to make sure you don't miss a use case.
    onNewIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    Log.v("KlaviyoSampleApp", "MainActivity.onNewIntent()")
    Log.v("KlaviyoSampleApp", "Launch Intent: " + intent.toString())
    super.onNewIntent(intent)

    // Android Installation Step 5: Call handlePush when a push notification is tapped
    // Note: due to platform differences, this step must be implemented in native code.
    // Tapping on a notification broadcasts an intent to your app. This method detects if the
    // intent originated from a Klaviyo push notification and registers a special Opened Push event
    Klaviyo.handlePush(intent)

    // Android Installation Step 6: Deep linking from native layer (uncommon)
    // Read deep link data from intent, open the appropriate page
    val action: String? = intent?.action // e.g. ACTION_VIEW
    val deepLink: Uri? = intent?.data // e.g. klaviyoreactnativesdkexample://link
  }

  @SuppressLint("InlinedApi") // It is safe to use Manifest.permission.POST_NOTIFICATIONS, ActivityCompat handles API level differences
  private fun requestPermissionWithRationale() =
    AlertDialog
      .Builder(this)
      .setTitle("Notifications Permission")
      .setMessage("Permission must be granted in order to receive push notifications in the system tray.")
      .setCancelable(true)
      .setPositiveButton("Grant") { _, _ ->
        // You can directly ask for the permission.
        // The registered ActivityResultCallback gets the result of this request.
        requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
      }.setNegativeButton("Cancel") { _, _ -> }
      .show()

  private fun alertPermissionDenied(): AlertDialog =
    AlertDialog
      .Builder(this)
      .setTitle("Notifications Disabled")
      .setMessage("Permission is denied and can only be changed from notification settings.")
      .setCancelable(true)
      .setPositiveButton("Settings...") { _, _ -> openSettings() }
      .setNegativeButton("Cancel") { _, _ -> }
      .show()

  private fun openSettings() {
    val intent =
      Intent(
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.fromParts("package", packageName, null),
      )
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK

    startActivity(intent)
  }
}
