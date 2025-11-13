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

  --skip-pod-install
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
  ./configure-sdk.sh -l
  ./configure-sdk.sh --local

  # Use only local iOS SDK
  ./configure-sdk.sh -l -i

  # Use both SDKs on master branch
  ./configure-sdk.sh -i -a

  # Use custom local path for Android SDK
  ./configure-sdk.sh --android=~/projects/klaviyo-android-sdk

  # Use specific branches (auto-detected as remote)
  ./configure-sdk.sh --android=feature/new-api --ios=develop

  # Mixed: local iOS, remote Android
  ./configure-sdk.sh --ios=../../../klaviyo-swift-sdk --android=develop

  # Combined short flags for all local defaults
  ./configure-sdk.sh -lia

EOF
}

# Parse command line arguments
LOCAL_FLAG=false
ANDROID_VALUE=""
IOS_VALUE=""
SKIP_POD_INSTALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -l|--local)
      LOCAL_FLAG=true
      shift
      ;;
    -a|--android)
      # Check if next arg exists and isn't a flag
      if [[ -n "$2" && ! "$2" =~ ^- ]]; then
        ANDROID_VALUE="$2"
        shift 2
      else
        ANDROID_VALUE="default"
        shift
      fi
      ;;
    --android=*)
      ANDROID_VALUE="${1#*=}"
      shift
      ;;
    -i|--ios)
      # Check if next arg exists and isn't a flag
      if [[ -n "$2" && ! "$2" =~ ^- ]]; then
        IOS_VALUE="$2"
        shift 2
      else
        IOS_VALUE="default"
        shift
      fi
      ;;
    --ios=*)
      IOS_VALUE="${1#*=}"
      shift
      ;;
    --skip-pod-install)
      SKIP_POD_INSTALL=true
      shift
      ;;
    -*)
      # Handle combined short flags (e.g., -lia, -la, -li)
      if [[ ${#1} -gt 2 ]]; then
        flags="${1#-}"
        for ((i=0; i<${#flags}; i++)); do
          case "${flags:$i:1}" in
            l) LOCAL_FLAG=true ;;
            a) ANDROID_VALUE="default" ;;
            i) IOS_VALUE="default" ;;
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

# Process defaults based on context
# "default" means local paths if -l flag specified, otherwise "master"
if [[ "$ANDROID_VALUE" == "default" ]]; then
  if [[ "$LOCAL_FLAG" == true ]]; then
    ANDROID_VALUE="../../klaviyo-android-sdk"
  else
    ANDROID_VALUE="master"
  fi
fi

if [[ "$IOS_VALUE" == "default" ]]; then
  if [[ "$LOCAL_FLAG" == true ]]; then
    IOS_VALUE="../../../klaviyo-swift-sdk"
  else
    IOS_VALUE="master"
  fi
fi

# Implicit skip logic: if any platform specified, skip others
if [[ -n "$ANDROID_VALUE" || -n "$IOS_VALUE" ]]; then
  [[ -z "$ANDROID_VALUE" ]] && ANDROID_VALUE="skip"
  [[ -z "$IOS_VALUE" ]] && IOS_VALUE="skip"
fi

# If -l flag with no platforms, default all to local
if [[ "$LOCAL_FLAG" == true && "$ANDROID_VALUE" == "skip" && "$IOS_VALUE" == "skip" ]]; then
  ANDROID_VALUE="../../klaviyo-android-sdk"
  IOS_VALUE="../../../klaviyo-swift-sdk"
fi

# Handle local SDK configuration
# Reusable function to configure local.properties for requested dependency
function configure_local_properties() {
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

# Reusable function to configure the podfile for requested dependency
function configure_podfile() {
  local podfile="./example/ios/Podfile"
  swift_sdk_version="$1"

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

# Configure local SDK for both directories
function configure_local_android_sdk() {
  local default_sdk_path="../../klaviyo-android-sdk"
  local sdk_path

  # Use provided value or prompt
  if [[ -n "$ANDROID_VALUE" ]]; then
    # Replace "default" with actual default path
    if [[ "$ANDROID_VALUE" == "default" ]]; then
      sdk_path="$default_sdk_path"
    else
      sdk_path="$ANDROID_VALUE"
    fi
  else
    read -rp "Enter the relative path to klaviyo-android-sdk (default: $default_sdk_path): " sdk_path
    sdk_path=${sdk_path:-$default_sdk_path}
  fi

  # Check if user wants to skip
  if [[ "$sdk_path" == "skip" ]]; then
    echo "Skipping Android SDK configuration"
    ANDROID_VALUE="skip"
    return
  fi

  echo "Using Android SDK path: $sdk_path"

  configure_local_properties "./android" "true" "$sdk_path"
  configure_local_properties "./example/android" "true" "../$sdk_path"
}

# Configure local swift SDK
function configure_local_swift_sdk() {
  local original_dir
  original_dir=$(pwd) # Save the original working directory

  local default_swift_sdk_path="../../../klaviyo-swift-sdk"
  local sdk_path

  # Use provided value or prompt
  if [[ -n "$IOS_VALUE" ]]; then
    # Replace "default" with actual default path
    if [[ "$IOS_VALUE" == "default" ]]; then
      sdk_path="$default_swift_sdk_path"
    else
      sdk_path="$IOS_VALUE"
    fi
  else
    read -rp "Enter the relative path to klaviyo-swift-sdk (default: $default_swift_sdk_path): " sdk_path
    sdk_path=${sdk_path:-$default_swift_sdk_path}
  fi

  # Check if user wants to skip
  if [[ "$sdk_path" == "skip" ]]; then
    echo "Skipping iOS SDK configuration"
    IOS_VALUE="skip"
    return
  fi

  echo "Using iOS SDK path: $sdk_path"

  # Ensure the path exists
  if [[ ! -d "./example/ios/$sdk_path" ]]; then
    echo "Error: Directory $sdk_path does not exist."
    exit 1
  fi

  configure_podfile "$sdk_path"

  cd "$original_dir" || exit 1 # Return to the original working directory
}

# Handle remote Android SDK configuration
function configure_remote_android_sdk() {
  local property_file="./android/gradle.properties"
  local property_key="KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion"

  if [[ ! -f "$property_file" ]]; then
    echo "Error: $property_file not found."
    exit 1
  fi

  local property_value
  property_value=$(grep "^$property_key=" "$property_file" | cut -d'=' -f2)

  if [[ -z "$property_value" ]]; then
    echo "Error: Property '$property_key' not found in $property_file."
    exit 1
  fi

  local sdkVersion

  # Use provided value or prompt
  if [[ -n "$ANDROID_VALUE" ]]; then
    # Replace "default" with "master" for remote mode
    if [[ "$ANDROID_VALUE" == "default" ]]; then
      sdkVersion="master"
    else
      sdkVersion="$ANDROID_VALUE"
    fi
  else
    echo "Enter the android SDK version, branch, or commit hash [return] to skip"
    echo "(current: $property_value)"
    read -r sdkVersion
    sdkVersion=${sdkVersion:-skip}
  fi

  # Check if user wants to skip
  if [[ "$sdkVersion" == "skip" ]]; then
    echo "Skipping Android SDK configuration"
    configure_local_properties "./android" "false"
    configure_local_properties "./example/android" "false"
    ANDROID_VALUE="skip"
    return
  fi

  echo "Using Android SDK version: $sdkVersion"

  configure_local_properties "./android" "false"
  configure_local_properties "./example/android" "false"

  # Validate and format SDK version (semantic version or commit hash are unchanged, else assume it is a branch name)
  if [[ ! "$sdkVersion" =~ ^[0-9]+\.[0-9]+\.[0-9]+.*$ && ! "$sdkVersion" =~ ^[a-f0-9]{7,40}$ ]]; then
    # Replace slashes with tildes and append "-SNAPSHOT"
    sdkVersion="${sdkVersion//\//~}-SNAPSHOT"
  fi

  if grep -q "^$property_key=" $property_file; then
    sed -i '' "s/^$property_key=.*/$property_key=$sdkVersion/" $property_file
  else
    echo "$property_key=$sdkVersion" >> $property_file
  fi

  echo "Now targeting Android SDK version: $sdkVersion"
  echo "You should clean/sync gradle now."
}

# Handle remote Swift SDK configuration
function configure_remote_swift_sdk() {
  local swift_sdk_version

  # Use provided value or prompt
  if [[ -n "$IOS_VALUE" ]]; then
    # Replace "default" with "master" for remote mode
    if [[ "$IOS_VALUE" == "default" ]]; then
      swift_sdk_version="master"
    else
      swift_sdk_version="$IOS_VALUE"
    fi
  else
    read -rp "Enter the swift SDK version, branch, or commit hash [return] to skip: " swift_sdk_version
    swift_sdk_version=${swift_sdk_version:-skip}
  fi

  # Check if user wants to skip
  if [[ "$swift_sdk_version" == "skip" ]]; then
    echo "Skipping iOS SDK configuration"
    IOS_VALUE="skip"
    return
  fi

  echo "Using iOS SDK version: $swift_sdk_version"

  configure_podfile "$swift_sdk_version"
}

function choose_from_menu() {
    local prompt="$1" outVar="$2"
    shift
    shift
    local options=("$@") cur=0 count=$#

    # Display prompt
    echo -n "$prompt"
    echo

    # Save cursor position
    tput sc

    while true; do
        # Clear the menu area
        tput rc

        # Display menu options
        for ((i=0; i<count; i++)); do
            if [[ "$i" == "$cur" ]]; then
                echo -e " \033[38;5;41m>\033[0m\033[38;5;35m${options[$i]}\033[0m"
            else
                echo "  ${options[$i]}"
            fi
        done

        # Read in pressed key
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

    # Pass chosen selection to main body of script
    eval "$outVar='${options[$cur]}'"
}


# Main execution - handle interactive mode if no values specified
INTERACTIVE_MODE=false
if [[ -z "$ANDROID_VALUE" && -z "$IOS_VALUE" ]]; then
  INTERACTIVE_MODE=true
  # Interactive mode: show menu (simplified, just to proceed)
  tput clear
  echo "This script will help you configure the Klaviyo Android and Swift SDK dependencies"
  echo
  echo "Press Enter to continue or Ctrl+C to exit..."
  read -r
fi

# Execute configuration based on values or interactive mode
if [[ "$ANDROID_VALUE" != "skip" || "$INTERACTIVE_MODE" == true ]]; then
  if [[ "$INTERACTIVE_MODE" == true || -z "$ANDROID_VALUE" ]]; then
    # Interactive: call with no args to prompt
    configure_local_android_sdk
  elif [[ "$ANDROID_VALUE" =~ ^(\.\./|\./|~|/) ]]; then
    # Local path detected
    configure_local_android_sdk "$ANDROID_VALUE"
  else
    # Remote branch/version
    configure_remote_android_sdk "$ANDROID_VALUE"
  fi
fi

if [[ "$IOS_VALUE" != "skip" || "$INTERACTIVE_MODE" == true ]]; then
  if [[ "$INTERACTIVE_MODE" == true || -z "$IOS_VALUE" ]]; then
    # Interactive: call with no args to prompt
    configure_local_swift_sdk
  elif [[ "$IOS_VALUE" =~ ^(\.\./|\./|~|/) ]]; then
    # Local path detected
    configure_local_swift_sdk "$IOS_VALUE"
  else
    # Remote branch/version
    configure_remote_swift_sdk "$IOS_VALUE"
  fi
fi

# Handle pod install
if [[ "$SKIP_POD_INSTALL" == true ]]; then
  echo "Skipped 'pod install' (--skip-pod-install flag provided)"
elif [[ "$IOS_VALUE" == "skip" ]]; then
  echo "Skipped 'pod install' (iOS SDK configuration was skipped)"
elif [[ -n "$selected_choice" ]]; then
  # Interactive mode: ask user
  read -rp "Do you want to run 'pod install'? (Y/n): " response
  response=${response:-y}
  if [[ "$response" =~ ^[yY]$ ]]; then
    cd ./example/ios || { echo "Error: Directory ./example/ios not found."; exit 1; }
    bundle exec pod install
    echo "'pod install' completed successfully."
  else
    echo "Skipped 'pod install'."
  fi
else
  # Non-interactive mode: run pod install automatically
  echo "Running 'pod install'..."
  cd ./example/ios || { echo "Error: Directory ./example/ios not found."; exit 1; }
  bundle exec pod install
  echo "'pod install' completed successfully."
fi