#!/usr/bin/env bash
# Preflight for one deploy platform: reports whether every secret it needs is
# present. Prints `<platform>_ready=true|false` and `<platform>_missing=<names>`
# on stdout (the caller appends them to GITHUB_OUTPUT). Only emptiness is
# inspected; secret values are never printed.
#
# A deploy with missing secrets is skipped on push/release (exit 0,
# ready=false, one ::notice::) and fails on workflow_dispatch / pull_request
# (a human asked for the deploy: ::error::, exit 1).
#
# Usage: check-secrets.sh <android|ios>
# Env: EVENT_NAME (github.event_name) and one variable per required secret.
set -euo pipefail

ANDROID_REQUIRED="KLAVIYO_EXAMPLE_API_KEY GOOGLE_SERVICES_JSON SIGNING_KEY KEY_STORE_PASSWORD ALIAS KEY_PASSWORD SERVICE_ACCOUNT_JSON"
IOS_REQUIRED="KLAVIYO_EXAMPLE_API_KEY GOOGLE_SERVICE_INFO_PLIST_BASE64 APP_STORE_CONNECT_API_KEY_ID APP_STORE_CONNECT_API_KEY_ISSUER_ID APP_STORE_CONNECT_API_KEY_BASE64 MATCH_PASSWORD MATCH_DEPLOY_KEY BUILD_CERTIFICATE_BASE64 P12_PASSWORD APPLE_TEAM_ID"

[ $# -eq 1 ] || {
  echo "usage: $0 <android|ios>" >&2
  exit 2
}
platform=$1

case "$platform" in
  android) required=$ANDROID_REQUIRED ;;
  ios) required=$IOS_REQUIRED ;;
  *)
    echo "unknown platform: $platform" >&2
    exit 2
    ;;
esac

missing=""
for name in $required; do
  if [ -z "${!name:-}" ]; then
    missing="${missing:+$missing, }$name"
  fi
done

echo "${platform}_missing=$missing"

if [ -z "$missing" ]; then
  echo "${platform}_ready=true"
  exit 0
fi

echo "${platform}_ready=false"
case "${EVENT_NAME:-}" in
  workflow_dispatch | pull_request)
    echo "::error::Cannot deploy $platform: missing secrets $missing"
    exit 1
    ;;
  *)
    echo "::notice::Skipping $platform deploy: missing secrets $missing"
    exit 0
    ;;
esac
