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
      Configure local SDK dependencies (file paths to local SDK repositories)
      If no platform flags provided, defaults to standard paths for both platforms

  -r, --remote
      Configure remote SDK dependencies (versions, branches, or commit hashes)

  -a, --android=<value>
      Specify Android SDK configuration:
        - For --local: relative path to klaviyo-android-sdk directory (default: ../../klaviyo-android-sdk)
        - For --remote: version number, branch name, or commit hash (default: master)
        - Use "skip" to skip Android configuration
        - Implicitly skipped if --ios is provided without --android

  -i, --ios=<value>
      Specify iOS/Swift SDK configuration:
        - For --local: relative path to klaviyo-swift-sdk directory (default: ../../../klaviyo-swift-sdk)
        - For --remote: version number, branch name, or commit hash (default: master)
        - Use "skip" to skip iOS configuration
        - Implicitly skipped if --android is provided without --ios

  --skip-pod-install
      Skip running 'pod install' after configuration

VALUE FORMATS:
  Local paths (--local):
    - Relative paths like: ../../klaviyo-android-sdk
    - Example: --android=../../klaviyo-android-sdk

  Remote versions (--remote):
    - Semantic version: 1.2.3
    - Branch name: feat/new-feature
    - Commit hash: a1b2c3d (7-40 characters)

EOF
}

# Parse command line arguments
MODE=""
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
      MODE="local"
      shift
      ;;
    -r|--remote)
      MODE="remote"
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
      # Handle combined short flags (e.g., -la, -li, -lar)
      if [[ ${#1} -gt 2 ]]; then
        flags="${1#-}"
        for ((i=0; i<${#flags}; i++)); do
          case "${flags:$i:1}" in
            l) MODE="local" ;;
            r) MODE="remote" ;;
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

# Implicit skip logic and defaults for non-interactive mode
if [[ -n "$MODE" ]]; then
  # If one platform specified, other is implicitly skip
  if [[ -n "$ANDROID_VALUE" && -z "$IOS_VALUE" ]]; then
    IOS_VALUE="skip"
  elif [[ -n "$IOS_VALUE" && -z "$ANDROID_VALUE" ]]; then
    ANDROID_VALUE="skip"
  fi

  # For local mode, default to standard paths if neither platform specified
  if [[ "$MODE" == "local" && -z "$ANDROID_VALUE" && -z "$IOS_VALUE" ]]; then
    ANDROID_VALUE="../../klaviyo-android-sdk"
    IOS_VALUE="../../../klaviyo-swift-sdk"
  fi
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


# Main execution - handle interactive mode if MODE not specified
if [[ -z "$MODE" ]]; then
  # Interactive mode: show menu to select mode
  declare -a selections
  selections=(
      "Local SDKs"
      "Remote (semantic version or git branch/commit)"
      "Exit"
  )

  # Display header
  tput clear
  echo "This script will help you configure the Klaviyo Android and Swift SDK dependencies"
  echo

  # Call menu function
  choose_from_menu "Select an option using arrow keys and press Enter:" selected_choice "${selections[@]}"

  # Set MODE from selection
  if [[ "$selected_choice" == "Local SDKs" ]]; then
    MODE="local"
  elif [[ "$selected_choice" == "Remote (semantic version or git branch/commit)" ]]; then
    MODE="remote"
  elif [[ "$selected_choice" == "Exit" ]]; then
    echo "Exiting..."
    exit 0
  fi
fi

# Execute configuration based on mode
if [[ "$MODE" == "local" ]]; then
  configure_local_android_sdk
  configure_local_swift_sdk
elif [[ "$MODE" == "remote" ]]; then
  configure_remote_android_sdk
  configure_remote_swift_sdk
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