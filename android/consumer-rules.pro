# TEMPORARY WORKAROUND -- belongs in klaviyo-android-sdk, not here.
#
# AGP 9's R8 removes the no-arg constructor from Room's generated
# androidx.work.impl.WorkDatabase_Impl while keeping the class itself. WorkManager
# builds that database from androidx.startup's ContentProvider, before any app code
# runs, so the failure is an InstantiationException that kills the process at launch:
#
#   java.lang.RuntimeException: Unable to get provider androidx.startup.InitializationProvider
#   Caused by: Failed to create an instance of class androidx.work.impl.WorkDatabase
#     at androidx.work.WorkManagerInitializer
#
# androidx.work arrives here transitively:
#   klaviyo-android-sdk:analytics -> androidx.work:work-runtime-ktx:{require 2.9.0; reject _}
# work-runtime 2.9.0 predates AGP 9, and its own proguard.txt keeps Workers and
# ListenableWorker constructors but says nothing about the Room database.
#
# Reproduced on React Native 0.87.1 (AGP 9.2.1, Gradle 9.4.1) with minifyEnabled true,
# against both this branch and the published klaviyo-react-native-sdk@2.5.0 -- so it is
# not specific to any wrapper change. Debug builds are unaffected. React Native 0.86 and
# below ship AGP 8.12.0 or older and do not hit it.
#
# This rule lives in the wrapper only to unblock React Native consumers. Native Android
# consumers of klaviyo-android-sdk on AGP 9 hit the identical crash and are NOT covered
# by it. The durable fixes are a consumer rule in klaviyo-android-sdk:analytics, and
# dropping the strict pin so apps can resolve a WorkManager that ships current rules.
# Remove this file once the Android SDK carries the rule.
#
# Tracked: MAGE-1199 (klaviyo-android-sdk)
-keep class androidx.work.impl.WorkDatabase_Impl { <init>(); }
