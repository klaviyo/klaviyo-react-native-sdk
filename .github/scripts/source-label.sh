#!/usr/bin/env bash
# Prints the source label for Slack/notes: `release <tag>` on release events,
# else the PR head branch when set (pull_request events, where ref_name is the
# synthetic `123/merge`), else the ref name. Characters outside
# A-Za-z0-9._/ +- are stripped so a hostile tag or branch name can't break
# out of the surrounding message markup.
#
# Env: EVENT_NAME, RELEASE_TAG, HEAD_REF, REF_NAME.
set -euo pipefail

if [ "${EVENT_NAME:-}" = "release" ] && [ -n "${RELEASE_TAG:-}" ]; then
  label="release $RELEASE_TAG"
elif [ -n "${HEAD_REF:-}" ]; then
  label="$HEAD_REF"
else
  label="${REF_NAME:-}"
fi

printf '%s' "$label" | tr -cd 'A-Za-z0-9._/ +-'
printf '\n'
