package com.klaviyoreactnative

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.klaviyo.analytics.Klaviyo

class MainActivity : ReactActivity() {
    override fun getMainComponentName() = "KlaviyoReactNative"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Fetches the current push token and registers with Push SDK
//        FirebaseMessaging.getInstance().token.addOnSuccessListener { pushToken ->
//            Klaviyo.setPushToken(pushToken)
//        }

//        onNewIntent(intent)
    }
//
//    override fun onNewIntent(intent: Intent?) {
//        super.onNewIntent(intent)
//
//        // Tracks when a system tray notification is opened
//        Klaviyo.handlePush(intent)
//    }
}