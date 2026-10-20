#!/usr/bin/env bash
# Prints the store release notes for one platform: the build-info header read
# from example/.env, then the release name and body when RELEASE_TAG is set
# (release events, or a dispatch at a release tag), truncated to the store's character cap.
#
# Usage: release-notes.sh <android|ios> <max-length>   (run from the repo root)
# On a workflow_dispatch at a tag (REF_TYPE=tag) the release is read with
# `gh release view`, which needs GH_TOKEN; a failed lookup exits non-zero.
#
# Env: EVENT_NAME, REF_TYPE, GH_TOKEN, RELEASE_TAG, HEAD_REF, REF_NAME, RELEASE_NAME, RELEASE_BODY, RUN_URL
set -euo pipefail
export LC_ALL=C.UTF-8

platform=$1
max=$2

if [ "${EVENT_NAME:-}" = "workflow_dispatch" ] && [ "${REF_TYPE:-}" = "tag" ] && [ -z "${RELEASE_TAG:-}" ]; then
  if ! release=$(gh release view "$REF_NAME" --repo "$GITHUB_REPOSITORY" --json tagName,name,body); then
    echo "::error::Could not read GitHub release ${REF_NAME} for the store notes" >&2
    exit 1
  fi
  RELEASE_TAG=$(jq -r '.tagName' <<<"$release")
  RELEASE_NAME=$(jq -r '.name // .tagName' <<<"$release")
  RELEASE_BODY=$(jq -r '.body // ""' <<<"$release")
fi

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
