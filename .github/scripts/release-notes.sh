#!/usr/bin/env bash
# Prints the store release notes for one platform: the build-info header read
# from example/.env, then the release name and body when RELEASE_TAG is set
# (release events, or a dispatch at a release tag), truncated to the store's character cap.
#
# Usage: release-notes.sh <android|ios> <max-length>   (run from the repo root)
# Env: EVENT_NAME, RELEASE_TAG, HEAD_REF, REF_NAME, RELEASE_NAME, RELEASE_BODY, RUN_URL
set -euo pipefail
export LC_ALL=C.UTF-8

platform=$1
max=$2

if [ -n "${RELEASE_TAG:-}" ]; then
  source_label="release ${RELEASE_TAG:-}"
else
  source_label="${HEAD_REF:-${REF_NAME:-}}"
fi
source_label=$(printf '%s' "$source_label" | tr -cd 'A-Za-z0-9._/ +:-')

notes=$(node example/scripts/sdk-ref.js --print-header --platform "$platform" \
  --source-label "$source_label" --event "${EVENT_NAME:-}" --run-url "${RUN_URL:-}")

if [ -n "${RELEASE_TAG:-}" ]; then
  notes="${notes}"$'\n\n'"Release notes (${RELEASE_NAME:-${RELEASE_TAG:-}}):"$'\n'"${RELEASE_BODY:-}"
fi

if [ "${#notes}" -gt "$max" ]; then
  notes="${notes:0:$((max - 13))}"$'\n'"…[truncated]"
fi
printf '%s' "$notes"
