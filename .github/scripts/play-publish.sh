#!/usr/bin/env bash
# Thin wrapper over the Google Play Edits API for the example app's CI publish.
# Used instead of r0adkll/upload-google-play so the workflow can tell a
# versionCode conflict apart from any other failure and retry with a new code.
#
# Usage:
#   play-publish.sh highest-version-code
#       Prints the highest versionCode of any bundle uploaded for the app.
#   play-publish.sh upload <aab> <version-code> <track> [release-notes-file]
#       Uploads the bundle, assigns it to <track> as a completed release and
#       commits the edit. Exit codes: 0 = success, 75 = versionCode conflict
#       (caller should rebuild with a higher code), anything else = failure.
#
# Env: PACKAGE_NAME (required). Auth comes from the gcloud credentials set up
# by google-github-actions/auth. The androidpublisher scope must be requested
# explicitly: the default cloud-platform scope gets empty responses.
set -euo pipefail

: "${PACKAGE_NAME:?PACKAGE_NAME is required}"
API="https://androidpublisher.googleapis.com/androidpublisher/v3/applications/$PACKAGE_NAME"
UPLOAD_API="https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/$PACKAGE_NAME"
EXIT_CONFLICT=75

TOKEN=$(gcloud auth print-access-token --scopes=https://www.googleapis.com/auth/androidpublisher)
AUTH="Authorization: Bearer $TOKEN"
RESPONSE_FILE=$(mktemp)
EDIT_ID=""

cleanup() {
  # Abandon an uncommitted edit so it doesn't linger.
  if [ -n "$EDIT_ID" ]; then
    curl -sS -o /dev/null -X DELETE -H "$AUTH" "$API/edits/$EDIT_ID" || true
  fi
  rm -f "$RESPONSE_FILE"
}
trap cleanup EXIT

# call METHOD URL [curl args...] — writes the body to $RESPONSE_FILE and
# prints the HTTP status. Never aborts on HTTP errors; callers decide.
call() {
  local method=$1 url=$2
  shift 2
  curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' -X "$method" -H "$AUTH" "$@" "$url"
}

# Play reports a reused versionCode a few different ways depending on where
# it's caught (upload vs. commit), so match on the stable parts.
is_version_conflict() {
  grep -qiE 'version ?code.*(already been used|already exists)|apkUpgradeVersionConflict|versionCodeConflict' "$RESPONSE_FILE"
}

fail() {
  echo "::error::$1 (HTTP $2)" >&2
  cat "$RESPONSE_FILE" >&2
  echo >&2
  if is_version_conflict; then
    exit $EXIT_CONFLICT
  fi
  exit 1
}

create_edit() {
  local status
  status=$(call POST "$API/edits" -H "Content-Type: application/json" -d '{}')
  [ "$status" = 200 ] || fail "Failed to create edit" "$status"
  EDIT_ID=$(jq -r '.id' "$RESPONSE_FILE")
}

highest_version_code() {
  local status
  create_edit
  # /edits/{id}/bundles returns every bundle for the app, not just this edit's.
  status=$(call GET "$API/edits/$EDIT_ID/bundles")
  [ "$status" = 200 ] || fail "Failed to list bundles" "$status"
  jq '[.bundles[]?.versionCode // 0] | max // 0' "$RESPONSE_FILE"
}

upload() {
  local aab=$1 version_code=$2 track=$3 notes_file=${4:-} notes="" status uploaded release

  create_edit

  echo "Uploading $aab (versionCode $version_code) to edit $EDIT_ID"
  status=$(call POST "$UPLOAD_API/edits/$EDIT_ID/bundles?uploadType=media" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$aab")
  [ "$status" = 200 ] || fail "Bundle upload failed" "$status"
  uploaded=$(jq -r '.versionCode' "$RESPONSE_FILE")
  if [ "$uploaded" != "$version_code" ]; then
    echo "::error::Play reports versionCode $uploaded but $version_code was expected" >&2
    exit 1
  fi

  if [ -n "$notes_file" ]; then
    notes=$(cat "$notes_file")
  fi
  release=$(jq -n \
    --arg code "$version_code" \
    --arg name "${RELEASE_NAME:-$version_code}" \
    --arg notes "$notes" \
    '{releases: [{
        name: $name,
        versionCodes: [$code],
        status: "completed"
      } + (if $notes == "" then {} else {releaseNotes: [{language: "en-US", text: $notes}]} end)]}')

  echo "Assigning versionCode $version_code to track '$track'"
  status=$(call PUT "$API/edits/$EDIT_ID/tracks/$track" \
    -H "Content-Type: application/json" \
    -d "$release")
  [ "$status" = 200 ] || fail "Track update failed" "$status"

  echo "Committing edit $EDIT_ID"
  status=$(call POST "$API/edits/$EDIT_ID:commit")
  [ "$status" = 200 ] || fail "Edit commit failed" "$status"
  EDIT_ID=""
  echo "Published versionCode $version_code to '$track'"
}

case "${1:-}" in
  highest-version-code)
    highest_version_code
    ;;
  upload)
    shift
    [ $# -ge 3 ] || { echo "usage: $0 upload <aab> <version-code> <track> [release-notes-file]" >&2; exit 2; }
    upload "$@"
    ;;
  *)
    echo "usage: $0 {highest-version-code|upload ...}" >&2
    exit 2
    ;;
esac
