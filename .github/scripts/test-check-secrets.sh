#!/usr/bin/env bash
# Tests for check-secrets.sh: the ready/skip/fail decision per event, the
# per-platform lists, and that secret values never reach the output.
# Usage: test-check-secrets.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/check-secrets.sh"

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

# Every required name for both platforms, set to a fake value that must never
# appear in any output.
ALL_ANDROID="KLAVIYO_EXAMPLE_API_KEY GOOGLE_SERVICES_JSON SIGNING_KEY KEY_STORE_PASSWORD ALIAS KEY_PASSWORD SERVICE_ACCOUNT_JSON"
ALL_IOS="GOOGLE_SERVICE_INFO_PLIST_BASE64 APP_STORE_CONNECT_API_KEY_ID APP_STORE_CONNECT_API_KEY_ISSUER_ID APP_STORE_CONNECT_API_KEY_BASE64 MATCH_PASSWORD MATCH_DEPLOY_KEY BUILD_CERTIFICATE_BASE64 P12_PASSWORD APPLE_TEAM_ID"
FAKE="fake-secret-value-xyz"

set_all() {
  local n
  for n in $ALL_ANDROID $ALL_IOS; do
    export "$n=$FAKE"
  done
}

unset_all() {
  local n
  for n in $ALL_ANDROID $ALL_IOS; do
    unset "$n" 2>/dev/null || true
  done
}

# 1. All present on push: both platforms ready.
(
  set_all
  out=$(EVENT_NAME=push "$SCRIPT" android)
  grep -q '^android_ready=true$' <<<"$out" || {
    echo "FAIL: all-present push android: $out" >&2
    exit 1
  }
  out=$(EVENT_NAME=push "$SCRIPT" ios)
  grep -q '^ios_ready=true$' <<<"$out" || {
    echo "FAIL: all-present push ios: $out" >&2
    exit 1
  }
) && pass "all present on push: ready" || fail_count=$((fail_count + 1))

# 2. One Android secret missing on push: exit 0, ready=false, notice names it;
#    ios unaffected.
(
  set_all
  unset SIGNING_KEY
  out=$(EVENT_NAME=push "$SCRIPT" android) || {
    echo "FAIL: missing-on-push should exit 0" >&2
    exit 1
  }
  grep -q '^android_ready=false$' <<<"$out" || exit 1
  grep -q '^android_missing=SIGNING_KEY$' <<<"$out" || {
    echo "FAIL: missing list wrong: $out" >&2
    exit 1
  }
  grep -q '::notice::Skipping android deploy: missing secrets SIGNING_KEY' <<<"$out" || exit 1
  out=$(EVENT_NAME=push "$SCRIPT" ios)
  grep -q '^ios_ready=true$' <<<"$out" || {
    echo "FAIL: ios affected by android secret" >&2
    exit 1
  }
) && pass "missing on push: skips green, names only the missing name" || fail_count=$((fail_count + 1))

# 3. Missing on release: same skip.
(
  set_all
  unset MATCH_PASSWORD MATCH_DEPLOY_KEY
  out=$(EVENT_NAME=release "$SCRIPT" ios) || exit 1
  grep -q '^ios_ready=false$' <<<"$out" || exit 1
  grep -q '::notice::' <<<"$out" || exit 1
  ! grep -q '::error::' <<<"$out" || exit 1
) && pass "missing on release: skips green" || fail_count=$((fail_count + 1))

# 4. Missing on workflow_dispatch: exit non-zero, ::error:: names the names.
(
  set_all
  unset SERVICE_ACCOUNT_JSON
  out=$(EVENT_NAME=workflow_dispatch "$SCRIPT" android) && {
    echo "FAIL: dispatch with missing secrets should exit non-zero" >&2
    exit 1
  }
  grep -q '^android_ready=false$' <<<"$out" || exit 1
  grep -q '::error::Cannot deploy android: missing secrets SERVICE_ACCOUNT_JSON' <<<"$out" || exit 1
) && pass "missing on workflow_dispatch: fails red" || fail_count=$((fail_count + 1))

# 5. Missing on pull_request (label deploy): exit non-zero.
(
  set_all
  unset P12_PASSWORD
  if EVENT_NAME=pull_request "$SCRIPT" ios >/dev/null 2>&1; then
    echo "FAIL: pull_request with missing secrets should exit non-zero" >&2
    exit 1
  fi
) && pass "missing on pull_request: fails red" || fail_count=$((fail_count + 1))

# 6. Empty string counts as missing (same as unset).
(
  set_all
  export ALIAS=""
  out=$(EVENT_NAME=push "$SCRIPT" android) || exit 1
  grep -q '^android_ready=false$' <<<"$out" || exit 1
  grep -q 'ALIAS' <<<"$out" || exit 1
) && pass "empty string treated as missing" || fail_count=$((fail_count + 1))

# 7. Only the requested platform's list is checked.
(
  unset_all
  set_all
  unset GOOGLE_SERVICE_INFO_PLIST_BASE64
  out=$(EVENT_NAME=push "$SCRIPT" android) || exit 1
  grep -q '^android_ready=true$' <<<"$out" || {
    echo "FAIL: android checked an ios secret: $out" >&2
    exit 1
  }
) && pass "only the requested platform is checked" || fail_count=$((fail_count + 1))

# 8. SLACK_WEBHOOK_URL is optional: unset or empty never blocks readiness.
(
  set_all
  unset SLACK_WEBHOOK_URL 2>/dev/null || true
  out=$(EVENT_NAME=push "$SCRIPT" android) || exit 1
  grep -q '^android_ready=true$' <<<"$out" || exit 1
  export SLACK_WEBHOOK_URL=""
  out=$(EVENT_NAME=push "$SCRIPT" ios) || exit 1
  grep -q '^ios_ready=true$' <<<"$out" || exit 1
) && pass "SLACK_WEBHOOK_URL unset/empty does not block readiness" || fail_count=$((fail_count + 1))

# 9. Fake secret values never appear in any output, success or failure.
(
  set_all
  unset SIGNING_KEY
  combined=$( (EVENT_NAME=push "$SCRIPT" android; EVENT_NAME=push "$SCRIPT" ios) 2>&1 || true)
  combined+="$(EVENT_NAME=workflow_dispatch "$SCRIPT" android 2>&1 || true)"
  if grep -q "$FAKE" <<<"$combined"; then
    echo "FAIL: secret value leaked into output" >&2
    exit 1
  fi
) && pass "secret values never printed" || fail_count=$((fail_count + 1))

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed" >&2
  exit 1
fi
echo "all check-secrets tests passed"
