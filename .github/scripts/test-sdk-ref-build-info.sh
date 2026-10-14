#!/usr/bin/env bash
# Verifies the workflow's in-app build-info wiring: runs sdk-ref.js with the
# same flags the publish workflow passes and asserts the generated
# example/.env carries non-empty, non-"unknown" KLAVIYO_BUILD_* values. The
# real example/.env is backed up and restored.
# Usage: test-sdk-ref-build-info.sh (run from the repo root)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/example/.env"
BACKUP=$(mktemp)
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP"
  HAD_ENV=1
else
  HAD_ENV=0
fi
restore() {
  if [ "$HAD_ENV" = 1 ]; then
    cp "$BACKUP" "$ENV_FILE"
  else
    rm -f "$ENV_FILE"
  fi
  rm -f "$BACKUP"
}
trap restore EXIT

cd "$REPO_ROOT"
node example/scripts/sdk-ref.js \
  --build 4242 \
  --commit abc1234deadbeef \
  --branch ecm/test-branch \
  --built "2026-10-14 02:00 UTC" >/dev/null

fail_count=0
check() { # key expected
  local value
  value=$(grep "^$1=" "$ENV_FILE" | cut -d= -f2-)
  if [ "$value" = "$2" ]; then
    echo "PASS: $1=$2"
  else
    echo "FAIL: $1: expected '$2', got '$value'"
    fail_count=$((fail_count + 1))
  fi
}

check KLAVIYO_BUILD_NUMBER 4242
check KLAVIYO_BUILD_COMMIT abc1234
check KLAVIYO_BUILD_BRANCH ecm/test-branch
check KLAVIYO_BUILD_BUILT "2026-10-14 02:00 UTC"

for key in KLAVIYO_BUILD_NUMBER KLAVIYO_BUILD_COMMIT KLAVIYO_BUILD_BRANCH KLAVIYO_BUILD_BUILT; do
  value=$(grep "^$key=" "$ENV_FILE" | cut -d= -f2-)
  if [ -z "$value" ] || [ "$value" = "unknown" ]; then
    echo "FAIL: $key is empty or unknown"
    fail_count=$((fail_count + 1))
  fi
done

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
echo "all sdk-ref build-info tests passed"
