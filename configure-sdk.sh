#!/bin/bash

# Help documentation
function show_help() {
  cat << EOF
Klaviyo SDK Configuration Script

This script configures the Klaviyo Android and Swift SDK dependencies for the
React Native SDK. It can be run with command line arguments, outlined below.
Or, without options the script runs in interactive mode with a menu interface.

OPTIONS:
  -h, --help
      Show this help message and exit

  -l, --local
      Convenience flag to configure both SDKs with default local paths
      Can be combined with platform flags to override defaults

  -a, --android[=<value>]
      Specify Android SDK configuration:
        - Version, branch, commit hash or filepath to local SDK
        - Default: If --local, ../../klaviyo-android-sdk, else cached version in gradle.properties

  -i, --ios[=<value>]
      Specify iOS/Swift SDK configuration:
        - Version, branch, commit hash or filepath to local SDK
        - Default: If --local, ../../../klaviyo-swift-sdk, else podspec version

  -s, --skip-pod-install
      Skip running 'pod install' after iOS configuration

EXAMPLES:
  # Use both local SDKs with default paths
  ./configure-sdk.sh --local

  # Configure Android or iOS SDKs to specific version, branch, commit or filepath
  ./configure-sdk.sh --android [version/branch/commit/filepath]
  ./configure-sdk.sh --ios [version/branch/commit/filepath]
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

# Interactive menu helper function
function choose_from_menu() {
    local prompt="$1" outvar="$2"
    shift
    shift
    local options=("$@") cur=0 count=$# index=0

    # Display prompt
    echo -n "$prompt"
    echo
    echo

    # Save cursor position
    tput sc

    while true; do
        # Restore cursor position
        tput rc

        # Display menu options
        for ((i=0; i<count; i++)); do
            if [[ "$i" == "$cur" ]]; then
                echo -e " \033[38;5;41m>\033[0m\033[38;5;35m${options[$i]}\033[0m"
            else
                echo "  ${options[$i]}"
            fi
        done
        echo

        # Read pressed key
        read -rsn1 key
        if [[ $key == $'\x1b' ]]; then
            read -rsn2 key
            case $key in
                '[A') # Up arrow
                    cur=$(( $cur - 1 ))
                    [ "$cur" -lt 0 ] && cur=$((count - 1))
                    ;;
                '[B') # Down arrow
                    cur=$(( $cur + 1 ))
                    [ "$cur" -ge $count ] && cur=0
                    ;;
            esac
        elif [[ $key == "" ]]; then # Enter key
            break
        fi
    done

    # Pass chosen selection to caller
    eval "$outvar='${options[$cur]}'"
}

# Interactive mode: prompt for all configuration choices if none were provided as arguments
if [[ "$is_local" == false && -z "$android_value" && -z "$ios_value" ]]; then
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
      read -rp "Enter the Android SDK version, branch, or commit hash (default: gradle.properties): " android_value
      android_value="${android_value:-gradle.properties}"

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
    # No local flag: "default" means gradle.properties for Android, podspec for iOS
    [[ "$android_value" == "default" ]] && android_value="gradle.properties"
    [[ "$ios_value" == "default" ]] && ios_value="podspec"
  fi
fi

# Toggle Android composite build mode
function configure_android_local_properties() {
  local android_dir="$1" # Directory to modify (i.e. SDK or Example)
  local enabled="$2" # true or false
  local sdk_path="$3" # path to local Android SDK
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

# Configure Android SDK version/path
function configure_android_gradle() {
  local android_sdk_version="$1"
  local property_file="./android/gradle.properties"
  local property_key="KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion"
  local saved_comment="# saved:"
  local cached_version
  local save_cached=true

  # Always restore from saved comment first if it exists
  if grep -q "^$saved_comment" "$property_file"; then
    cached_version=$(grep "^$saved_comment" "$property_file" | sed "s/^$saved_comment //")
    # Remove the saved comment line
    sed -i '' "/^$saved_comment/d" "$property_file"
    # Update the property value
    sed -i '' "s|^$property_key=.*|$property_key=$cached_version|" "$property_file"
  else
    cached_version=$(grep "^$property_key=" "$property_file" | cut -d'=' -f2)
  fi

  if [[ "$android_sdk_version" =~ ^(\.\./|\./|~|/) ]]; then
    # Configure local.properties for composite build
    configure_android_local_properties "./android" "true" "$android_sdk_version"
    configure_android_local_properties "./example/android" "true" "../$android_sdk_version"

    echo "Targeting Android SDK path: $android_sdk_version"
  else
    # Reset local.properties file
    configure_android_local_properties "./android" "false"
    configure_android_local_properties "./example/android" "false"

    # Validate and format SDK version (semantic version or commit hash are unchanged, else assume it is a branch name)
    if [[ "$android_sdk_version" == "gradle.properties" ]]; then
      save_cached=false
      echo "Resetting to gradle.properties version: $cached_version"
      android_sdk_version="$cached_version"
    elif [[ ! "$android_sdk_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+.*$ && ! "$android_sdk_version" =~ ^[a-f0-9]{7,40}$ ]]; then
      # Replace slashes with tildes and append "-SNAPSHOT"
      android_sdk_version="${android_sdk_version//\//~}-SNAPSHOT"
    fi

    echo "Targeting Android SDK version: $android_sdk_version"
  fi

  # Add saved comment above the property
  if [[ "$save_cached" == true ]]; then
    sed -i '' "/^$property_key=/i\\
$saved_comment $cached_version
" "$property_file"
  fi

  sed -i '' "s|^$property_key=.*|$property_key=$android_sdk_version|" "$property_file"

  echo "You should clean/sync gradle now in the IDE."
}

# Reusable function to configure the podfile for requested dependency
function configure_pods() {
  swift_sdk_version="$1"
  local podspec="./klaviyo-react-native-sdk.podspec"
  local podfile="./example/ios/Podfile"

  # Delete overridden dependencies first, if any
  sed -i '' "/pod 'KlaviyoCore'/d" "$podfile"
  sed -i '' "/pod 'KlaviyoSwift'/d" "$podfile"
  sed -i '' "/pod 'KlaviyoForms'/d" "$podfile"
  sed -i '' "/pod 'KlaviyoLocation'/d" "$podfile"

  # Restore podspec
  sed -i '' 's/\(s\.dependency "KlaviyoSwift"\) ##, "\([^"]*\)"/\1, "\2"/' "$podspec"
  sed -i '' 's/\(s\.dependency "KlaviyoForms"\) ##, "\([^"]*\)"/\1, "\2"/' "$podspec"
  sed -i '' 's/\(s\.dependency "KlaviyoLocation"\) ##, "\([^"]*\)"/\1, "\2"/' "$podspec"

  if [[ "$swift_sdk_version" == "podspec" ]]; then
    echo "Restored to $podspec"
    return
  fi

  # Comment out podspec version
  sed -i '' 's/\(s\.dependency "KlaviyoSwift"\), "\([^"]*\)"/\1 ##, "\2"/' "$podspec"
  sed -i '' 's/\(s\.dependency "KlaviyoForms"\), "\([^"]*\)"/\1 ##, "\2"/' "$podspec"
  sed -i '' 's/\(s\.dependency "KlaviyoLocation"\), "\([^"]*\)"/\1 ##, "\2"/' "$podspec"
  echo "Commented out version constraints in $podspec for local development"

  # List of dependencies
  dependencies=("KlaviyoCore" "KlaviyoSwift" "KlaviyoForms" "KlaviyoLocation")

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

# Execute configuration based on values
if [[ "$android_value" != "skip" ]]; then
  configure_android_gradle "$android_value"
  echo
fi

if [[ "$ios_value" != "skip" ]]; then
  configure_pods "$ios_value"

  # Handle pod install
  if [[ "$skip_pod_install" == true ]]; then
    echo "Skipped 'pod install'"
  else
    echo "Running 'pod install'..."
    cd ./example/ios || { echo "Error: Directory ./example/ios not found."; exit 1; }
    bundle exec pod install
    echo "'pod install' completed successfully."
  fi
fi
