#!/usr/bin/env bash
# Verifies the notes header comes from the SAME generated build info the app
# was built with: generate example/.env with known flags, then render the
# header with --print-header --from-env yes and assert every line matches the
# .env values (no fresh clock or git calls at notes time). Backs up and
# restores the real example/.env.
# Usage: test-notes-from-env.sh (run from the repo root)
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

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

node example/scripts/sdk-ref.js \
  --build 4242 \
  --commit abc1234deadbeef \
  --branch ecm/test-branch \
  --built "2026-10-14 02:00 UTC" >/dev/null

env_number=$(grep '^KLAVIYO_BUILD_NUMBER=' "$ENV_FILE" | cut -d= -f2-)
env_commit=$(grep '^KLAVIYO_BUILD_COMMIT=' "$ENV_FILE" | cut -d= -f2-)
env_built=$(grep '^KLAVIYO_BUILD_BUILT=' "$ENV_FILE" | cut -d= -f2-)

header=$(node example/scripts/sdk-ref.js --print-header --from-env yes \
  --platform ios \
  --app-name "RN Example" \
  --source-label "ecm/test-branch" \
  --event push \
  --run-url "https://example.com/run/1")

# The header must reflect the .env values, not a fresh clock: wait-free and
# deterministic, so compare directly.
grep -qF "RN Example" <<<"$header" || fail "app line missing"
grep -qF "($env_number)" <<<"$header" || fail "header build number != .env ($env_number)"
grep -qF "Commit: $env_commit on ecm/test-branch (push)" <<<"$header" || fail "header commit line wrong: $header"
grep -qF "Built: $env_built" <<<"$header" || fail "header Built line != .env ($env_built)"
grep -qF "CI run: https://example.com/run/1" <<<"$header" || fail "CI run line missing"

# A different --built flag must NOT change the --from-env header: the .env
# value wins.
header2=$(node example/scripts/sdk-ref.js --print-header --from-env yes \
  --platform ios \
  --built "1999-01-01 00:00 UTC" \
  --source-label "ecm/test-branch" \
  --event push \
  --run-url "https://example.com/run/1")
grep -qF "Built: $env_built" <<<"$header2" || fail "--from-env ignored the .env Built value"
if grep -qF "1999-01-01" <<<"$header2"; then
  fail "--from-env took a fresh --built value"
fi
pass "--print-header --from-env yes reads every shared value from .env"

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
echo "all notes-from-env tests passed"
