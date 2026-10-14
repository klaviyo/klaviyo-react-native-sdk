#!/usr/bin/env bash
# Composes the store release notes for one platform: the header block from
# `sdk-ref.js --print-header --from-env yes` — every shared value (version, SDK
# refs, build number, commit, branch, Built time) is read back from the
# example/.env the app was just built with, so the notes cannot drift from
# the in-app build info — then a blank line and the release body on release
# events, truncated to the store's cap by truncate-notes.sh (body first,
# then the CI run line; header lines are never cut).
#
# Usage: build-release-notes.sh <android|ios> <max-length>
# The generator must already have written example/.env for this attempt.
# Env: EVENT_NAME, RELEASE_TAG, HEAD_REF, REF_NAME (for the source label),
# RELEASE_NAME, RELEASE_BODY (release events), RUN_URL.
# Must run from the repo root with node on PATH.
set -euo pipefail

[ $# -eq 2 ] || {
  echo "usage: $0 <android|ios> <max-length>" >&2
  exit 2
}
platform=$1
max_length=$2

export LC_ALL=C.UTF-8
SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export EVENT_NAME RELEASE_TAG HEAD_REF REF_NAME
SOURCE_LABEL=$("$SCRIPTS/source-label.sh")

HEADER=$(node example/scripts/sdk-ref.js --print-header --from-env yes \
  --platform "$platform" \
  --source-label "$SOURCE_LABEL" \
  --event "${EVENT_NAME:-}" \
  --run-url "${RUN_URL:-}" \
  --app-name "RN Example")

NOTES="$HEADER"
if [ "${EVENT_NAME:-}" = "release" ]; then
  NOTES="${HEADER}"$'\n\n'"Release notes (${RELEASE_NAME:-${RELEASE_TAG:-}}):"$'\n'"${RELEASE_BODY:-}"
fi

RAW=$(mktemp)
trap 'rm -f "$RAW"' EXIT
printf '%s' "$NOTES" > "$RAW"
"$SCRIPTS/truncate-notes.sh" "$max_length" "$RAW"
