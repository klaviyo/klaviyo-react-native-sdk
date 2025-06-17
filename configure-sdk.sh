#!/bin/bash

# Handle local SDK configuration
# Reusable function to configure local.properties
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
  echo
}

# Configure local SDK for both directories
function configure_local_android_sdk() {
  local default_sdk_path="../../klaviyo-android-sdk"
  read -rp "Enter the relative path to klaviyo-android-sdk (default: $default_sdk_path): " sdk_path
  sdk_path=${sdk_path:-$default_sdk_path}
  echo

  configure_local_properties "./android" "true" "$sdk_path"
  configure_local_properties "./example/android" "true" "../$sdk_path"
}

function configure_local_swift_sdk() {
  local original_dir
  original_dir=$(pwd) # Save the original working directory
  cd ./example/ios || { echo "Error: Directory ./example/ios not found."; exit 1; }

  local swift_sdk_path="../../../klaviyo-swift-sdk"

  read -rp "Enter the relative path to klaviyo-swift-sdk (default: $swift_sdk_path): " sdk_path
  sdk_path=${sdk_path:-$swift_sdk_path}
  echo

  # Ensure the path exists
  if [[ ! -d "$sdk_path" ]]; then
    echo "Error: Directory $sdk_path does not exist."
    exit 1
  fi

  # Configure local properties for Swift SDK
  local podfile="./Podfile"
  if [[ ! -f "$podfile" ]]; then
    echo "Error: Podfile not found in ./example/ios."
    exit 1
  fi

  # Add or update the klaviyo-swift-sdk dependency in Podfile
  if grep -q "pod 'KlaviyoSwift'" "$podfile"; then
    sed -i '' "s/pod 'KlaviyoSwift'.*/pod 'KlaviyoSwift', :path => '$sdk_path'/" "$podfile"
    echo "Updated klaviyo-swift-sdk path in $podfile to $sdk_path"
  else
    echo "pod 'KlaviyoSwift', :path => '$sdk_path'" >> "$podfile"
    echo "Added klaviyo-swift-sdk dependency to $podfile with path $sdk_path"
  fi

  echo "Swift SDK configured successfully."

  cd "$original_dir" || exit 1 # Return to the original working directory
}

# Handle remote SDK configuration
function configure_remote_android_sdk() {
  configure_local_properties "./android" "false"
  configure_local_properties "./example/android" "false"

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

  echo "Enter SDK version, branch, or commit hash [return] to skip"
  echo "(current: $property_value)"
  read -r sdkVersion
  sdkVersion=${sdkVersion:-current}

  if [[ -n "$sdkVersion" && "$sdkVersion" != "current" ]]; then
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
  else
    echo "Skipping SDK version update."
    sdkVersion=property_value
  fi

  echo "Now targeting SDK version: $sdkVersion."
  echo "You should clean/sync gradle now."
  echo
}

function configure_remote_swift_sdk() {
  local podfile="./example/ios/Podfile"

  read -rp "Enter the swift SDK version, branch, or commit hash [return] to use podspec: " swift_sdk_version
  swift_sdk_version=${swift_sdk_version:-podspec}
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
      podfile_entry="pod '$dependency', '$swift_sdk_version'"
    elif [[ "$swift_sdk_version" =~ ^[a-f0-9]{7,40}$ ]]; then
      podfile_entry="pod '$dependency', :git => 'https://github.com/klaviyo/klaviyo-swift-sdk.git', :commit => '$swift_sdk_version'"
    else
      podfile_entry="pod '$dependency', :git => 'https://github.com/klaviyo/klaviyo-swift-sdk.git', :branch => '$swift_sdk_version'"
    fi

    nl=$'\n'
    sed -i '' "${target_line}a\\${nl}  $podfile_entry${nl}" "$podfile"
    echo "Added $dependency dependency to $podfile"
    target_line=$((target_line + 1)) # Increment target line for next insertion
  done
}

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
    eval "$outvar='${options[$cur]}'"
    echo
}

# Define menu options
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

# Handle selection
if [[ "$selected_choice" == "Local SDKs" ]]; then
  configure_local_android_sdk
  configure_local_swift_sdk

elif [[ "$selected_choice" == "Remote (semantic version or git branch/commit)" ]]; then
  configure_remote_android_sdk
  configure_remote_swift_sdk
fi

read -rp "Do you want to run 'pod install'? (Y/n): " response
response=${response:-y}
if [[ "$response" =~ ^[yY]$ ]]; then
  cd ./example/ios || { echo "Error: Directory ./example/ios not found."; exit 1; }
  bundle exec pod install
  echo "'pod install' completed successfully."
else
  echo "Skipped 'pod install'."
fi