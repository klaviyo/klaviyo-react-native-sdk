#!/bin/bash

set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Bump SDK version numbers and update dependencies.

Options:
  -v, --version VERSION       React SDK version (skips interactive prompt)
  -a, --android VERSION       Android SDK version (skips interactive prompt)
  -s, --swift VERSION         Swift SDK version (skips interactive prompt)
  --skip-native               Skip native dependency bumps entirely
  --skip-install              Skip yarn install and pod update steps
  -h, --help                  Show this help message

Examples:
  $(basename "$0")                              # Fully interactive (original behavior)
  $(basename "$0") -v 2.4.0 --skip-native       # Bump RN SDK only, no native deps
  $(basename "$0") -v 2.4.0 -a 3.2.0 -s 4.1.0  # Bump everything non-interactively
EOF
  exit 0
}

new_version=""
android_version=""
swift_version=""
skip_native=false
skip_install=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version)   new_version="$2"; shift 2 ;;
    -a|--android)   android_version="$2"; shift 2 ;;
    -s|--swift)     swift_version="$2"; shift 2 ;;
    --skip-native)  skip_native=true; shift ;;
    --skip-install) skip_install=true; shift ;;
    -h|--help)      usage ;;
    *)              echo "Unknown option: $1"; usage ;;
  esac
done

# --- React SDK version ---

if [[ -z "$new_version" ]]; then
  read -rp "Enter the new React SDK version: " new_version
fi

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

# --- Native dependencies (skippable) ---

if [[ "$skip_native" == true ]]; then
  echo "Skipping native dependency updates."
else
  # Android SDK version
  if [[ -z "$android_version" ]]; then
    read -rp "Enter the Android SDK version: " android_version
  fi

  gradle_properties="./android/gradle.properties"
  if [[ -f "$gradle_properties" ]]; then
    sed -i '' "s/KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=.*/KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=$android_version/" "$gradle_properties"
    echo "Updated Android SDK version in $gradle_properties."
  else
    echo "Error: $gradle_properties not found."
    exit 1
  fi

  # Swift SDK version
  if [[ -z "$swift_version" ]]; then
    read -rp "Enter the Swift SDK version: " swift_version
  fi

  podspec_file="klaviyo-react-native-sdk.podspec"
  if [[ -f "$podspec_file" ]]; then
    sed -i '' "s/\"KlaviyoSwift\", \".*\"/\"KlaviyoSwift\", \"$swift_version\"/" "$podspec_file"
    sed -i '' "s/\"KlaviyoForms\", \".*\"/\"KlaviyoForms\", \"$swift_version\"/" "$podspec_file"
    sed -i '' "s/\"KlaviyoLocation\", \".*\"/\"KlaviyoLocation\", \"$swift_version\"/" "$podspec_file"
    echo "Updated KlaviyoSwift, KlaviyoForms, and KlaviyoLocation version in $podspec_file."
  else
    echo "Error: $podspec_file not found."
    exit 1
  fi
fi

# --- Install steps (skippable) ---

if [[ "$skip_install" == true ]]; then
  echo "Skipping install steps."
  echo "All tasks completed successfully."
  exit 0
fi

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

# Run bundle install and pod update in the iOS directory (only if native deps were bumped)
if [[ "$skip_native" == false ]]; then
  ios_dir="$example_dir/ios"
  if [[ -d "$ios_dir" ]]; then
    cd "$ios_dir" || exit
    if [[ -f "Gemfile" ]]; then
      echo "Running bundle install..."
      bundle install || { echo "Error: Failed to run bundle install."; exit 1; }
    fi
    echo "Running pod update for KlaviyoSwift, KlaviyoForms, and KlaviyoLocation..."
    bundle exec pod update KlaviyoSwift KlaviyoForms KlaviyoLocation || { echo "Error: Failed to update pods."; exit 1; }
    cd - || exit
  else
    echo "Error: $ios_dir not found."
    exit 1
  fi
fi

echo "All tasks completed successfully."
