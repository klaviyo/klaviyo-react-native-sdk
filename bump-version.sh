#!/bin/bash

# Prompt for the new React SDK version
read -rp "Enter the new React SDK version: " new_version

# Update SDK version in package.json
if [[ -f "package.json" ]]; then
  jq --arg newVersion "$new_version" '.version = $newVersion' package.json > tmp.json && mv tmp.json package.json
  echo "Updated SDK version in package.json."
else
  echo "Error: package.json not found."
  exit 1
fi

# Update klaviyo_sdk_version in iOS plist file
plist_file="ios/klaviyo-sdk-configuration.plist"
if [[ -f "$plist_file" ]]; then
  /usr/libexec/PlistBuddy -c "Set :klaviyo_sdk_version $new_version" "$plist_file"
  echo "Updated klaviyo_sdk_version in $plist_file."
else
  echo "Error: $plist_file not found."
  exit 1
fi

# Update klaviyo_sdk_version_override in Android strings.xml
android_strings="android/src/main/res/values/strings.xml"
if [[ -f "$android_strings" ]]; then
  sed -i '' "s/<string name=\"klaviyo_sdk_version_override\">.*<\/string>/<string name=\"klaviyo_sdk_version_override\">$new_version<\/string>/" "$android_strings"
  echo "Updated klaviyo_sdk_version_override in $android_strings."
else
  echo "Error: $android_strings not found."
  exit 1
fi

# Prompt for the Android SDK version
read -rp "Enter the Android SDK version: " android_version

# Update Android SDK version in gradle.properties
gradle_properties="./android/gradle.properties"
if [[ -f "$gradle_properties" ]]; then
  sed -i '' "s/KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=.*/KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=$android_version/" "$gradle_properties"
  echo "Updated Android SDK version in $gradle_properties."
else
  echo "Error: $gradle_properties not found."
  exit 1
fi

# Prompt for the Swift SDK version
read -rp "Enter the Swift SDK version: " swift_version

# Update Swift SDK version in the podspec
podspec_file="klaviyo-react-native-sdk.podspec"
if [[ -f "$podspec_file" ]]; then
  sed -i '' "s/\"KlaviyoSwift\", \".*\"/\"KlaviyoSwift\", \"$swift_version\"/" "$podspec_file"
  sed -i '' "s/\"KlaviyoForms\", \".*\"/\"KlaviyoForms\", \"$swift_version\"/" "$podspec_file"
  echo "Updated KlaviyoSwift and KlaviyoForms version in $podspec_file."
else
  echo "Error: $podspec_file not found."
  exit 1
fi

# Run yarn install or npm install in the example app directory
example_dir="example"
if [[ -d "$example_dir" ]]; then
  echo "Running yarn install in $example_dir..."
  cd "$example_dir" || exit
  if ! yarn install; then
    echo "yarn install failed. Trying npm install..."
    npm install || { echo "Error: Failed to install dependencies."; exit 1; }
  fi
  cd - || exit
else
  echo "Error: $example_dir not found."
  exit 1
fi

# Run bundle install and pod update in the iOS directory
ios_dir="$example_dir/ios"
if [[ -d "$ios_dir" ]]; then
  cd "$ios_dir" || exit
  if [[ -f "Gemfile" ]]; then
    echo "Running bundle install..."
    bundle install || { echo "Error: Failed to run bundle install."; exit 1; }
  fi
  echo "Running pod update for KlaviyoSwift..."
  bundle exec pod update KlaviyoSwift || { echo "Error: Failed to update pods."; exit 1; }
  cd - || exit
else
  echo "Error: $ios_dir not found."
  exit 1
fi

echo "All tasks completed successfully."