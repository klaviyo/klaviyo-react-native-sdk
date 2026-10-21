#!/usr/bin/env bash
# Fails unless every Klaviyo native SDK dependency is pinned to a released
# version: no commit SHA, branch, SNAPSHOT or local path on Android, and no
# :git/:branch/:commit/:path pods or unversioned podspec dependencies on iOS.
#
# Usage: check-native-pins.sh   (run from the repo root)
set -euo pipefail

errors=()

android=$(sed -n 's/^KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=//p' android/gradle.properties | tr -d '[:space:]')
if ! [[ "$android" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || [[ "$android" == *SNAPSHOT* ]]; then
  errors+=("android/gradle.properties: KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion is '${android}', not a released version")
fi

while IFS= read -r line; do
  errors+=("klaviyo-react-native-sdk.podspec: unversioned Klaviyo dependency: ${line}")
done < <(grep -nE '^[[:space:]]*s\.dependency[[:space:]]+"Klaviyo[A-Za-z]*"[[:space:]]*(#.*)?$' klaviyo-react-native-sdk.podspec || true)

while IFS= read -r line; do
  errors+=("example/ios/Podfile: Klaviyo pod not from a release: ${line}")
done < <(grep -nE "^[[:space:]]*pod[[:space:]]+['\"]Klaviyo[A-Za-z]*['\"].*:(git|branch|commit|path|tag)[[:space:]]*=>" example/ios/Podfile || true)

if [ "${#errors[@]}" -gt 0 ]; then
  for e in "${errors[@]}"; do
    echo "::error::${e}"
  done
  echo "::error::Revert the native SDK pin and bump to released native SDK versions before releasing."
  exit 1
fi

echo "Native SDK dependencies are pinned to released versions (Android ${android})"
