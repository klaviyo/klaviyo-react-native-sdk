#!/usr/bin/env bash
# Fails unless every Klaviyo native SDK dependency is pinned to a released
# version: no commit SHA, branch, SNAPSHOT or local path on Android, and no
# :git/:branch/:commit/:path pods or unversioned podspec dependencies on iOS.
#
# Usage: check-native-pins.sh   (run from the repo root)
set -euo pipefail

errors=()

# Prints Ruby statements one per line: comments stripped (a "#" at line start
# or after whitespace, not "#{" interpolation), blank lines dropped, and calls
# continued across lines (trailing comma, open paren or backslash) joined.
ruby_statements() {
  sed -E -e 's/(^|[[:space:]])#([^{].*)?$//' "$1" | awk '
    /^[[:space:]]*$/ { next }
    { line = (buf == "" ? $0 : buf " " $0) }
    /(,|\(|\\)[[:space:]]*$/ { buf = line; next }
    { print line; buf = "" }
    END { if (buf != "") print buf }'
}

android=$(sed -n 's/^KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=//p' android/gradle.properties | tr -d '[:space:]')
if ! [[ "$android" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.?[0-9]+)?)?$ ]]; then
  errors+=("android/gradle.properties: KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion is '${android}', not a released version")
fi

while IFS= read -r line; do
  errors+=("klaviyo-react-native-sdk.podspec: unversioned Klaviyo dependency: ${line}")
done < <(grep -E "^[[:space:]]*s\.dependency[[:space:]]*\(?[[:space:]]*['\"]Klaviyo[A-Za-z]*['\"][[:space:]]*\)?[[:space:]]*$" <(ruby_statements klaviyo-react-native-sdk.podspec) || true)

while IFS= read -r line; do
  errors+=("example/ios/Podfile: Klaviyo pod not from a release: ${line}")
done < <(grep -E "^[[:space:]]*pod[[:space:]]*\(?[[:space:]]*['\"]Klaviyo[A-Za-z]*['\"].*(:(git|branch|commit|path|tag)[[:space:]]*=>|[^:A-Za-z_](git|branch|commit|path|tag):)" <(ruby_statements example/ios/Podfile) || true)

if [ "${#errors[@]}" -gt 0 ]; then
  for e in "${errors[@]}"; do
    echo "::error::${e}"
  done
  echo "::error::Revert the native SDK pin and bump to released native SDK versions before releasing."
  exit 1
fi

echo "Native SDK dependencies are pinned to released versions (Android ${android})"
