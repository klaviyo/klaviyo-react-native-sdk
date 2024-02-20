# Troubleshooting Guide

## Android Troubleshooting

1. We have seen projects, particularly on react-native versions `0.72.x` and `0.71.x`, that required a `minSdkVersion`
   of `24`, despite the Klaviyo Android SDK supporting API 23+. If you encounter this, please file an issue in our
   repository and provide version numbers of your react-native dependencies.

## iOS Troubleshooting

### CocoaPods Installation Issues

1. If you are seeing issues related to `minimum deployment target` when installing pods, you may need to update your
   minimum iOS version to 13.0 in your Podfile with one of the following strategies.

   - Specify iOS version directly in the `Podfile`:
     ```ruby
     MIN_IOS_OVERRIDE = '13.0'
     if Gem::Version.new(MIN_IOS_OVERRIDE) > Gem::Version.new(min_ios_version_supported)
         min_ios_version_supported = MIN_IOS_OVERRIDE
     end
     # existing code
     platform :ios, min_ios_version_supported
     ```
   - Set the deployment target to 13.0 in XCode, and then pull `IPHONEOS_DEPLOYMENT_TARGET` from the XCode project:

     ```ruby
     #######
     # Read min iOS version from Xcode project and set as min iOS version for Podfile
     require 'xcodeproj'

     project_path = './YOUR_XCODE_PROJECT.xcodeproj'
     project = Xcodeproj::Project.open(project_path)
     min_ios_version_supported = project.build_configurations.first.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
     ######

     platform :ios, min_ios_version_supported
     ```

2. If the command `pod install` is outputting version mismatch errors for `KlaviyoSwift`, please run `pod update KlaviyoSwift`
   as indicated in the error message to update your local pods spec repo.
