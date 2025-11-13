#!/bin/bash

# Help documentation
function show_help() {
  cat << EOF
Klaviyo SDK Configuration Script

This script configures the Klaviyo Android and Swift SDK dependencies for the
React Native SDK. It can be run interactively or with command-line arguments.

USAGE:
  ./configure-sdk.sh
  Without options, the script runs in interactive mode with a menu interface.

OPTIONS:
  -h, --help
      Show this help message and exit

  -l, --local
      Convenience flag to configure both SDKs with default local paths
      Can be combined with platform flags to override defaults
      When used with short flags, makes them default to local paths

  -a, --android[=<value>]
      Specify Android SDK configuration:
        - Path (starts with ../, ./, ~, /): Use local SDK at that path
        - Branch/commit/version: Use remote SDK
        - No value with -l: Use default local path (../../klaviyo-android-sdk)
        - No value without -l: Use master branch
        - "skip": Skip Android configuration

  -i, --ios[=<value>]
      Specify iOS/Swift SDK configuration:
        - Path (starts with ../, ./, ~, /): Use local SDK at that path
        - Branch/commit/version: Use remote SDK
        - No value with -l: Use default local path (../../../klaviyo-swift-sdk)
        - No value without -l: Use master branch
        - "skip": Skip iOS configuration

  -s, --skip-pod-install
      Skip running 'pod install' after iOS configuration

VALUE FORMATS:
  Local paths:
    - Relative: ../../klaviyo-android-sdk, ../../../klaviyo-swift-sdk
    - Absolute: ~/projects/klaviyo-android-sdk
    - Auto-detected when value starts with ../, ./, ~, or /

  Remote references:
    - Branch name: feat/new-feature, develop, master
    - Commit hash: a1b2c3d (7-40 characters)
    - Semantic version: 1.2.3
    - Auto-detected for all other values

EXAMPLES:
  # Use both local SDKs with default paths
  ./configure-sdk.sh --local

  # Use custom local path for iOS or Android SDK
  ./configure-sdk.sh --android=~/projects/klaviyo-android-sdk
  ./configure-sdk.sh --ios=~/projects/klaviyo-swift-sdk

  # Use specific branches (auto-detected as remote)
  ./configure-sdk.sh --android=feature/new-api --ios=develop

EOF
}

# Default SDK paths
DEFAULT_ANDROID_SDK_PATH="../../klaviyo-android-sdk"
DEFAULT_IOS_SDK_PATH="../../../klaviyo-swift-sdk"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
is_local=false
android_value=""
ios_value=""
skip_pod_install=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -l|--local)
      is_local=true
      shift
      ;;
    -a|--android)
      # Check if next arg exists and isn't a flag
      if [[ -n "$2" && ! "$2" =~ ^- ]]; then
        android_value="$2"
        shift 2
      else
        android_value="default"
        shift
      fi
      ;;
    --android=*)
      android_value="${1#*=}"
      shift
      ;;
    -i|--ios)
      # Check if next arg exists and isn't a flag
      if [[ -n "$2" && ! "$2" =~ ^- ]]; then
        ios_value="$2"
        shift 2
      else
        ios_value="default"
        shift
      fi
      ;;
    --ios=*)
      ios_value="${1#*=}"
      shift
      ;;
    -s|--skip-pod-install)
      skip_pod_install=true
      shift
      ;;
    -*)
      # Handle combined short flags (e.g., -lia, -la, -li)
      if [[ ${#1} -gt 2 ]]; then
        flags="${1#-}"
        for ((i=0; i<${#flags}; i++)); do
          case "${flags:$i:1}" in
            l) is_local=true ;;
            a) android_value="default" ;;
            i) ios_value="default" ;;
            s) skip_pod_install=true ;;
            h) show_help; exit 0 ;;
            *)
              echo "Unknown flag: -${flags:$i:1}"
              echo "Run '$0 --help' for usage information"
              exit 1
              ;;
          esac
        done
        shift
      else
        echo "Unknown option: $1"
        echo "Run '$0 --help' for usage information"
        exit 1
      fi
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage information"
      exit 1
      ;;
  esac
done

# Interactive mode: prompt for all configuration choices if none were provided as arguments
if [[ "$is_local" == false && -z "$android_value" && -z "$ios_value" ]]; then
  # Source menu helper function
  source "$SCRIPT_DIR/lib/choose_from_menu.sh"

  tput clear
  echo "This script will help you configure the Klaviyo Android and Swift SDK dependencies"
  echo

  # Ask for configuration type
  config_type=""
  local_option="Local paths"
  remote_option="Remote (branch/commit/version)"
  choose_from_menu "Choose configuration type:" config_type "$local_option" "$remote_option"

  case "$config_type" in
    "$local_option")
      echo
      echo "A relative path should be relative to ./android"
      read -rp "Enter the path to klaviyo-android-sdk (default: $DEFAULT_ANDROID_SDK_PATH): " android_value
      android_value="${android_value:-$DEFAULT_ANDROID_SDK_PATH}"
      echo

      echo "A relative path should be relative to ./example/ios"
      read -rp "Enter the relative path to klaviyo-swift-sdk (default: $DEFAULT_IOS_SDK_PATH): " ios_value
      ios_value="${ios_value:-$DEFAULT_IOS_SDK_PATH}"
      ;;
    "$remote_option")
      read -rp "Enter the Android SDK version, branch, or commit hash (default: master): " android_value
      android_value="${android_value:-master}"

      read -rp "Enter the iOS SDK version, branch, or commit hash (default: podspec): " ios_value
      ios_value="${ios_value:-podspec}"
      ;;
  esac

  # Pod install prompt
  if [[ "$ios_value" != "skip" && "$skip_pod_install" != true ]]; then
    echo
    read -rp "Do you want to run 'pod install'? (Y/n): " response
    response=${response:-y}
    if [[ ! "$response" =~ ^[yY]$ ]]; then
      skip_pod_install=true
    fi
  fi
else
  # Non-interactive mode: process defaults and implicit skips
  if [[ -z "$android_value" && -z "$ios_value" ]]; then
    # If neither platform specified, default both
    android_value="default"
    ios_value="default"
  elif [[ -n "$android_value" || -n "$ios_value" ]]; then
    # Implicit skip logic: if one platform specified, skip the other
    [[ -z "$android_value" ]] && android_value="skip"
    [[ -z "$ios_value" ]] && ios_value="skip"
  fi

  if [[ "$is_local" == true ]]; then
    # Local flag: "default" means local paths
    [[ "$android_value" == "default" ]] && android_value="$DEFAULT_ANDROID_SDK_PATH"
    [[ "$ios_value" == "default" ]] && ios_value="$DEFAULT_IOS_SDK_PATH"
  else
    # No local flag: "default" means master branch for Android, podspec for iOS
    [[ "$android_value" == "default" ]] && android_value="master"
    [[ "$ios_value" == "default" ]] && ios_value="podspec"
  fi
fi

# Handle local SDK configuration
# Reusable function to configure local.properties for requested dependency
function configure_android_local_properties() {
  local android_dir="$1"
  local enabled="$2" # true or false
  local sdk_path="$3"
  local local_properties_file="$android_dir/local.properties"
  local template_file="$android_dir/local.properties.template"

  # Check if local.properties exists, if not, copy from template
  if [ ! -f "$local_properties_file" ]; then
    if [ -f "$template_file" ]; then
      cp "$template_file" "$local_properties_file"
      echo "Copied $template_file to $local_properties_file"
    else
      echo "Template file $template_file not found. Cannot create $local_properties_file."
      exit 1
    fi
  fi

  # Ensure localCompositeBuild is present and set to requested value
  if ! grep -q "^localCompositeBuild=" "$local_properties_file"; then
    echo "localCompositeBuild=$enabled" >> "$local_properties_file"
    echo "Added localCompositeBuild=$enabled to $local_properties_file"
  else
    sed -i '' "s/^localCompositeBuild=.*/localCompositeBuild=$enabled/" "$local_properties_file"
    echo "Updated localCompositeBuild to $enabled in $local_properties_file"
  fi

  # Ensure localSdkPath is set in local.properties
  if [[ -n "$sdk_path" ]]; then
    if ! grep -q "^localSdkPath=" "$local_properties_file"; then
      echo "localSdkPath=$sdk_path" >> "$local_properties_file"
      echo "Added localSdkPath=$sdk_path to $local_properties_file"
    else
      sed -i '' "s|^localSdkPath=.*|localSdkPath=$sdk_path|" "$local_properties_file"
      echo "Updated localSdkPath to $sdk_path in $local_properties_file"
    fi
  fi
}

# Configure local SDK for both directories
function configure_local_android_sdk() {
  local sdk_path="$1"

  echo "Using Android SDK path: $sdk_path"

  configure_android_local_properties "./android" "true" "$sdk_path"
  configure_android_local_properties "./example/android" "true" "../$sdk_path"
}

# Handle remote Android SDK configuration
function configure_remote_android_sdk() {
  local android_sdk_version="$1"
  local property_file="./android/gradle.properties"
  local property_key="KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion"

  if [[ ! -f "$property_file" ]]; then
    echo "Error: $property_file not found."
    exit 1
  fi

  echo "Using Android SDK version: $android_sdk_version"

  configure_android_local_properties "./android" "false"
  configure_android_local_properties "./example/android" "false"

  # Validate and format SDK version (semantic version or commit hash are unchanged, else assume it is a branch name)
  if [[ ! "$android_sdk_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+.*$ && ! "$android_sdk_version" =~ ^[a-f0-9]{7,40}$ ]]; then
    # Replace slashes with tildes and append "-SNAPSHOT"
    android_sdk_version="${android_sdk_version//\//~}-SNAPSHOT"
  fi

  if grep -q "^$property_key=" $property_file; then
    sed -i '' "s/^$property_key=.*/$property_key=$android_sdk_version/" $property_file
  else
    echo "$property_key=$android_sdk_version" >> $property_file
  fi

  echo "Now targeting Android SDK version: $android_sdk_version"
  echo "You should clean/sync gradle now in the IDE."
}

# Reusable function to configure the podfile for requested dependency
function configure_podfile() {
  swift_sdk_version="$1"
  local podfile="./example/ios/Podfile"

  # Delete the overridden dependencies first
  sed -i '' "/pod 'KlaviyoCore'/d" "$podfile"
  sed -i '' "/pod 'KlaviyoSwift'/d" "$podfile"
  sed -i '' "/pod 'KlaviyoForms'/d" "$podfile"

  if [[ -z "$swift_sdk_version" || "$swift_sdk_version" == "podspec" ]]; then
    echo "Skipping Swift SDK version update."
    return
  fi

  # List of dependencies
  dependencies=("KlaviyoCore" "KlaviyoSwift" "KlaviyoForms")

  # Find the line number of the target block
  target_line=$(grep -n "# Insert override klaviyo-swift-sdk pods below this line when needed" "$podfile" | cut -d: -f1)

  for dependency in "${dependencies[@]}"; do
    if [[ "$swift_sdk_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+.*$ ]]; then
      #Semantic version
      podfile_entry="pod '$dependency', '$swift_sdk_version'"
    elif [[ "$swift_sdk_version" =~ ^(\./|\.\./).* ]]; then
      # Relative file path
      podfile_entry="pod '$dependency', :path => '$swift_sdk_version'"
    elif [[ "$swift_sdk_version" =~ ^[a-f0-9]{7,40}$ ]]; then
      # Commit hash
      podfile_entry="pod '$dependency', :git => 'https://github.com/klaviyo/klaviyo-swift-sdk.git', :commit => '$swift_sdk_version'"
    else
      # Assume a git branch name
      podfile_entry="pod '$dependency', :git => 'https://github.com/klaviyo/klaviyo-swift-sdk.git', :branch => '$swift_sdk_version'"
    fi

    nl=$'\n'
    sed -i '' "${target_line}a\\${nl}  $podfile_entry${nl}" "$podfile"
    echo "Added $dependency dependency to $podfile"
    target_line=$((target_line + 1)) # Increment target line for next insertion
  done
}

# Configure local swift SDK
function configure_local_swift_sdk() {
  local sdk_path="$1"

  echo "Using iOS SDK path: $sdk_path"

  # Ensure the path exists
  if [[ ! -d "./example/ios/$sdk_path" ]]; then
    echo "Error: Directory $sdk_path does not exist."
    exit 1
  fi

  configure_podfile "$sdk_path"
}

# Handle remote Swift SDK configuration
function configure_remote_swift_sdk() {
  local swift_sdk_version="$1"

  echo "Using iOS SDK version: $swift_sdk_version"

  configure_podfile "$swift_sdk_version"
}

# Execute configuration based on values
if [[ "$android_value" != "skip" ]]; then
  if [[ "$android_value" =~ ^(\.\./|\./|~|/) ]]; then
    # Local path detected
    configure_local_android_sdk "$android_value"
  else
    # Remote branch/version
    configure_remote_android_sdk "$android_value"
  fi
fi

if [[ "$ios_value" != "skip" ]]; then
  if [[ "$ios_value" =~ ^(\.\./|\./|~|/) ]]; then
    # Local path detected
    configure_local_swift_sdk "$ios_value"
  else
    # Remote branch/version
    configure_remote_swift_sdk "$ios_value"
  fi
fi

# Handle pod install
if [[ "$skip_pod_install" == true ]]; then
  echo "Skipped 'pod install'"
elif [[ "$ios_value" == "skip" ]]; then
  echo "Skipped 'pod install' (iOS SDK configuration was skipped)"
else
  echo "Running 'pod install'..."
  cd ./example/ios || { echo "Error: Directory ./example/ios not found."; exit 1; }
  bundle exec pod install
  echo "'pod install' completed successfully."
fi