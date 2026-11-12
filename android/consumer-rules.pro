# TEMPORARY WORKAROUND -- belongs in klaviyo-android-sdk, not here.
#
# Room <= 2.6.1 ships "-keep class * extends androidx.room.RoomDatabase" with no member
# spec. AGP 9 sets android.r8.strictFullModeForKeepRules=true, so -keep on a class no
# longer implies keeping its no-arg constructor. R8 is behaving correctly; Room's rule
# was written for the old semantics. R8 therefore strips the constructor from Room's
# generated androidx.work.impl.WorkDatabase_Impl while keeping the class, and WorkManager
# builds that database reflectively from androidx.startup's ContentProvider before any
# app code runs:
#
#   java.lang.RuntimeException: Unable to get provider androidx.startup.InitializationProvider
#   Caused by: Failed to create an instance of class androidx.work.impl.WorkDatabase
#     at androidx.work.WorkManagerInitializer
#
# androidx.work arrives transitively via klaviyo-android-sdk:analytics, which uses it for
# the analytics queue flush scheduler. We never use Room directly.
#
# Reproduced on React Native 0.87.1 (AGP 9.2.1, Gradle 9.4.1) with minifyEnabled true,
# against both this branch and the published klaviyo-react-native-sdk@2.5.0 -- so it is
# not specific to any wrapper change. Debug builds are unaffected. React Native 0.86 and
# below ship AGP 8.12.0 or older and do not hit it.
#
# Google fixed this in Room 2.7.0, which reaches us at androidx.work 2.11.0. We are on
# 2.9.0 (Room 2.5.0) because work 2.11 ships Kotlin 2.1 metadata that our 1.9.25 toolchain
# cannot read, so taking it needs a Kotlin upgrade first.
#
# Apps can already override androidx.work themselves -- our published "require 2.9.0" is a
# floor, not a lock, and highest-wins resolution means their declaration takes precedence.
# Nothing in the crash tells them that, which is why we carry the rule.
#
# This file exists only to unblock React Native consumers. Native Android consumers hit
# the identical crash uncovered. Delete it once klaviyo-android-sdk:analytics carries the
# rule and this wrapper's SDK pin is bumped to that release.
#
# Tracked: MAGE-1199 (klaviyo-android-sdk)
-keep class androidx.work.impl.WorkDatabase_Impl { <init>(); }
