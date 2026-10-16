#!/usr/bin/env bash
# Asserts a built artifact carries the version being uploaded, so a stale or
# misconfigured build never reaches the store under the wrong number.
#
# Usage:
#   assert-artifact-version.sh ios <ipa> <expected-build> <expected-short-version> [<expected-full-version>]
#   assert-artifact-version.sh android <aab> <expected-code> <expected-name>
#
# iOS: reads CFBundleVersion / CFBundleShortVersionString from
# Payload/*.app/Info.plist inside the IPA. Uses /usr/libexec/PlistBuddy on
# macOS and falls back to python3 plistlib elsewhere. With a full version, the
# KlaviyoBuildInfo key must start with it.
#
# Android: reads versionCode / versionName from the AAB's manifest with
# aapt2 (from $ANDROID_HOME build-tools or PATH). AAB manifests are protobuf,
# which aapt2 cannot dump directly, so the manifest is converted to a binary
# APK manifest first.
set -euo pipefail

fail() {
  echo "::error::$1" >&2
  exit 1
}

# Prints the path of aapt2: PATH first, else the newest under
# $ANDROID_HOME/build-tools. Exits non-zero when none is found.
find_aapt2() {
  local found
  found=$(command -v aapt2 || true)
  if [ -z "$found" ] && [ -n "${ANDROID_HOME:-}" ]; then
    found=$(find "$ANDROID_HOME/build-tools" -name aapt2 -type f 2>/dev/null \
      | awk -F/ '{ v = $(NF - 1); sub(/-.*/, "", v); print v "\t" $0 }' \
      | sort -t. -k1,1n -k2,2n -k3,3n -k4 \
      | tail -1 | cut -f2)
  fi
  [ -n "$found" ] || return 1
  printf '%s\n' "$found"
}

[ $# -eq 4 ] || [ $# -eq 5 ] || {
  echo "usage: $0 <ios|android> <artifact> <expected-code> <expected-name> [<expected-full-version>]" >&2
  exit 2
}
platform=$1
artifact=$2
expected_code=$3
expected_name=$4
expected_full=${5:-}

[ -f "$artifact" ] || fail "Artifact not found: $artifact"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

read_plist_value() { # plist-file key
  if [ -x /usr/libexec/PlistBuddy ]; then
    /usr/libexec/PlistBuddy -c "Print :$2" "$1"
  else
    python3 - "$1" "$2" <<'PY'
import plistlib, sys
with open(sys.argv[1], 'rb') as f:
    print(plistlib.load(f)[sys.argv[2]])
PY
  fi
}

case "$platform" in
  ios)
    unzip -o -q "$artifact" 'Payload/*.app/Info.plist' -d "$WORK"
    plist=$(find "$WORK/Payload" -name Info.plist | head -1)
    [ -n "$plist" ] || fail "No Payload/*.app/Info.plist in $artifact"
    actual_code=$(read_plist_value "$plist" CFBundleVersion) || fail "CFBundleVersion missing in $plist"
    actual_name=$(read_plist_value "$plist" CFBundleShortVersionString) || fail "CFBundleShortVersionString missing in $plist"
    if [ -n "$expected_full" ]; then
      build_info=$(read_plist_value "$plist" KlaviyoBuildInfo) || fail "KlaviyoBuildInfo missing in $plist"
      case "$build_info" in
        "$expected_full "*) ;;
        *) fail "$platform artifact $artifact has KlaviyoBuildInfo '$build_info', expected it to start with '$expected_full' — refusing to upload" ;;
      esac
    fi
    ;;
  android)
    aapt2=$(find_aapt2) || fail "aapt2 not found (set ANDROID_HOME or add build-tools to PATH)"
    unzip -o -q "$artifact" 'base/manifest/AndroidManifest.xml' -d "$WORK/aab" || fail "No base/manifest/AndroidManifest.xml in $artifact"
    mkdir "$WORK/manifest"
    cp "$WORK/aab/base/manifest/AndroidManifest.xml" "$WORK/manifest/AndroidManifest.xml"
    (cd "$WORK/manifest" && zip -q ../proto.apk AndroidManifest.xml)
    "$aapt2" convert --output-format binary -o "$WORK/binary.apk" "$WORK/proto.apk" || fail "aapt2 could not convert the manifest of $artifact"
    badging=$("$aapt2" dump badging "$WORK/binary.apk") || fail "aapt2 could not read the manifest of $artifact"
    actual_code=$(sed -nE "s/^package:.* versionCode='([0-9]+)'.*/\1/p" <<<"$badging" | head -1)
    actual_name=$(sed -nE "s/^package:.* versionName='([^']*)'.*/\1/p" <<<"$badging" | head -1)
    [ -n "$actual_code" ] || fail "versionCode missing in $artifact manifest"
    [ -n "$actual_name" ] || fail "versionName missing in $artifact manifest"
    ;;
  *)
    echo "unknown platform: $platform" >&2
    exit 2
    ;;
esac

if [ "$actual_code" != "$expected_code" ]; then
  fail "$platform artifact $artifact has build $actual_code, expected $expected_code — refusing to upload"
fi
if [ "$actual_name" != "$expected_name" ]; then
  fail "$platform artifact $artifact has version '$actual_name', expected '$expected_name' — refusing to upload"
fi
echo "Verified $platform artifact: build $actual_code, version $actual_name"
