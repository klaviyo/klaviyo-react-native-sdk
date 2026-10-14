#!/usr/bin/env bash
# Tests for source-label.sh. No fixtures needed; cases differ only in env.
# Usage: test-source-label.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/source-label.sh"

fail_count=0

fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}

pass() {
  echo "PASS: $1"
}

expect() {
  local name=$1 expected=$2
  shift 2
  local actual
  actual=$(env "$@" "$SCRIPT")
  if [ "$actual" = "$expected" ]; then
    pass "$name"
  else
    fail "$name: expected '$expected', got '$actual'"
  fi
}

expect "push to master" "master" \
  EVENT_NAME=push RELEASE_TAG= HEAD_REF= REF_NAME=master

expect "push to rel/2.6.0" "rel/2.6.0" \
  EVENT_NAME=push RELEASE_TAG= HEAD_REF= REF_NAME=rel/2.6.0

expect "pull_request prints head branch, never 123/merge" "ecm/MAGE-1075/continuous-deployment" \
  EVENT_NAME=pull_request RELEASE_TAG= HEAD_REF=ecm/MAGE-1075/continuous-deployment REF_NAME=123/merge

expect "release tag" "release v2.6.0" \
  EVENT_NAME=release RELEASE_TAG=v2.6.0 HEAD_REF= REF_NAME=master

expect "release tag with quote and backtick is stripped" 'release v1 rm' \
  EVENT_NAME=release 'RELEASE_TAG=v1"; rm' HEAD_REF= REF_NAME=master

expect "workflow_dispatch uses ref name" "ecm/some-branch" \
  EVENT_NAME=workflow_dispatch RELEASE_TAG= HEAD_REF= REF_NAME=ecm/some-branch

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed" >&2
  exit 1
fi
echo "all source-label tests passed"
