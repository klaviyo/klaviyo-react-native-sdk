package com.klaviyoreactnative

import android.app.Application
import com.facebook.react.BuildConfig
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.PackageList;
import com.facebook.soloader.SoLoader
import com.klaviyo.analytics.Klaviyo

class MainApplication : Application(), ReactApplication {
    override fun getReactNativeHost() = object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport() = BuildConfig.DEBUG

        override fun getPackages() = PackageList(this).packages.apply {
            add(KlaviyoPackage())
        }

        override fun getJSMainModuleName() = "index"
    }

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this,  /* native exopackage */false)
        Klaviyo.initialize("Xr5bFG", applicationContext)
//        ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
    }
}