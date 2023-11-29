package com.klaviyoreactnative

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.Manifest
import android.util.Log
import com.facebook.react.ReactActivity
import com.google.firebase.messaging.FirebaseMessaging
import com.klaviyo.analytics.Klaviyo
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ReactActivity() {
    override fun getMainComponentName() = "KlaviyoReactNative"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        askNotificationPermission()

        onNewIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)

        // Tracks when a system tray notification is opened
        Klaviyo.handlePush(intent)
    }

    // Declare the launcher at the top of your Activity/Fragment:
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { isGranted: Boolean ->
        if (isGranted) {
            // Fetches the current push token and registers with Push SDK
            FirebaseMessaging.getInstance().token.addOnSuccessListener { pushToken ->
                Klaviyo.setPushToken(pushToken)
            }
        } else {
            // TODO: Inform user that that your app will not show notifications.
        }
    }

    private fun askNotificationPermission() {
        // This is only necessary for API level >= 33 (TIRAMISU)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
            ) {
                // Fetches the current push token and registers with Push SDK
                FirebaseMessaging.getInstance().token.addOnSuccessListener { pushToken ->
                    Klaviyo.setPushToken(pushToken)
                }

                Log.d("Klaviyo", "permission granted -- in if")
            } else if (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                // TODO: display an educational UI explaining to the user the features that will be enabled
                //       by them granting the POST_NOTIFICATION permission. This UI should provide the user
                //       "OK" and "No thanks" buttons. If the user selects "OK," directly request the permission.
                //       If the user selects "No thanks," allow the user to continue without notifications.
            } else {
                // Directly ask for the permission
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}