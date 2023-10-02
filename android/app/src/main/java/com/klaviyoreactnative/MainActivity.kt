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


//    fun alertPermissionDenied() {
//        AlertDialog.Builder(context)
//            .setTitle("Notifications Disabled")
//            .setMessage("Permission is denied and can only be changed from notification settings.")
//            .setCancelable(true)
//            .setPositiveButton("Settings...") { _, _ -> openSettings() }
//            .setNegativeButton("Cancel") { _, _ -> }
//            .show()
//    }
//
//    fun openSettings() {
//        val intent = Intent(
//            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
//            Uri.fromParts("package", context.packageName, null)
//        )
//        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
//
//        context.startActivity(intent)
//    }
//
//    /**
//     * Check if we have user's permission to post notifications
//     * NOTE: Not the same as whether we have a push token
//     *
//     * @return
//     */
//    private fun isNotificationPermissionGranted(): Boolean = ActivityCompat.checkSelfPermission(
//        context,
//        Manifest.permission.POST_NOTIFICATIONS
//    ) == PackageManager.PERMISSION_GRANTED
//
//    fun requestPushNotifications() {
//        // https://klaviyo.atlassian.net/wiki/spaces/EN/pages/3675848705/Android+Notification+Permission
//        when {
//            isNotificationPermissionGranted() -> {
//                // GRANTED - We have notification permission
//                // Safeguard: this method shouldn't be called from the UI if push is already enabled
//                return
//            }
//            ActivityCompat.shouldShowRequestPermissionRationale(
//                context as Activity,
//                Manifest.permission.POST_NOTIFICATIONS
//            ) -> {
//                // Only reachable on API level 33+
//                // when permission was denied before, but we are still allowed
//                // to display an educational dialog and request permission again.
//                // Request the permission, which invokes a callback method
//                AlertDialog.Builder(context)
//                    .setTitle("Notifications Permission")
//                    .setMessage("Permission must be granted in order to receive push notifications in the system tray.")
//                    .setCancelable(true)
//                    .setPositiveButton("Grant") { _, _ ->
//                        // You can directly ask for the permission.
//                        // The registered ActivityResultCallback gets the result of this request.
//                        pushNotificationContract.launch(Manifest.permission.POST_NOTIFICATIONS)
//                    }
//                    .setNegativeButton("Cancel") { _, _ -> }
//                    .show()
//            }
//            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
//                // Request the permission, which invokes a callback method
//                pushNotificationContract.launch(Manifest.permission.POST_NOTIFICATIONS)
//            }
//            else -> {
//                // Only reachable below API Level 33
//                // DENIED - Notifications were turned off by the user in system settings
//                alertPermissionDenied()
//            }
//        }
//    }
}