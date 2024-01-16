package com.klaviyoreactnativesdk

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

class KlaviyoReactNativeSdkPackage : TurboReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? {
    return if (name == KlaviyoReactNativeSdkModule.NAME) {
      KlaviyoReactNativeSdkModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      moduleInfos[KlaviyoReactNativeSdkModule.NAME] =
        ReactModuleInfo(
          KlaviyoReactNativeSdkModule.NAME,
          KlaviyoReactNativeSdkModule.NAME,
          false,
          false,
          true,
          false,
          isTurboModule,
        )
      moduleInfos
    }
  }
}
