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

# run_check <platform> [env assignments...]: runs the script with a fresh
# OUTPUT_FILE and prints stdout (annotations) followed by the file contents
# (key=value lines). The script's exit status is preserved.
run_check() {
  local platform=$1 outfile status stdout
  shift
  outfile=$(mktemp)
  set +e
  stdout=$(OUTPUT_FILE="$outfile" "$@" "$SCRIPT" "$platform")
  status=$?
  set -e
  printf '%s\n' "$stdout"
  cat "$outfile"
  rm -f "$outfile"
  return "$status"
}

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
  out=$(run_check android env EVENT_NAME=push)
  grep -q '^android_ready=true$' <<<"$out" || {
    echo "FAIL: all-present push android: $out" >&2
    exit 1
  }
  out=$(run_check ios env EVENT_NAME=push)
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
  out=$(run_check android env EVENT_NAME=push) || {
    echo "FAIL: missing-on-push should exit 0" >&2
    exit 1
  }
  grep -q '^android_ready=false$' <<<"$out" || exit 1
  grep -q '^android_missing=SIGNING_KEY$' <<<"$out" || {
    echo "FAIL: missing list wrong: $out" >&2
    exit 1
  }
  grep -q '::notice::Skipping android deploy: missing secrets SIGNING_KEY' <<<"$out" || exit 1
  out=$(run_check ios env EVENT_NAME=push)
  grep -q '^ios_ready=true$' <<<"$out" || {
    echo "FAIL: ios affected by android secret" >&2
    exit 1
  }
) && pass "missing on push: skips green, names only the missing name" || fail_count=$((fail_count + 1))

# 3. Missing on release: same skip.
(
  set_all
  unset MATCH_PASSWORD MATCH_DEPLOY_KEY
  out=$(run_check ios env EVENT_NAME=release) || exit 1
  grep -q '^ios_ready=false$' <<<"$out" || exit 1
  grep -q '::notice::' <<<"$out" || exit 1
  ! grep -q '::error::' <<<"$out" || exit 1
) && pass "missing on release: skips green" || fail_count=$((fail_count + 1))

# 4. Missing on workflow_dispatch: exit non-zero, ::error:: names the names.
(
  set_all
  unset SERVICE_ACCOUNT_JSON
  out=$(run_check android env EVENT_NAME=workflow_dispatch) && {
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
  if run_check ios env EVENT_NAME=pull_request >/dev/null 2>&1; then
    echo "FAIL: pull_request with missing secrets should exit non-zero" >&2
    exit 1
  fi
) && pass "missing on pull_request: fails red" || fail_count=$((fail_count + 1))

# 6. Empty string counts as missing (same as unset).
(
  set_all
  export ALIAS=""
  out=$(run_check android env EVENT_NAME=push) || exit 1
  grep -q '^android_ready=false$' <<<"$out" || exit 1
  grep -q 'ALIAS' <<<"$out" || exit 1
) && pass "empty string treated as missing" || fail_count=$((fail_count + 1))

# 7. Only the requested platform's list is checked.
(
  unset_all
  set_all
  unset GOOGLE_SERVICE_INFO_PLIST_BASE64
  out=$(run_check android env EVENT_NAME=push) || exit 1
  grep -q '^android_ready=true$' <<<"$out" || {
    echo "FAIL: android checked an ios secret: $out" >&2
    exit 1
  }
) && pass "only the requested platform is checked" || fail_count=$((fail_count + 1))

# 8. SLACK_WEBHOOK_URL is optional: unset or empty never blocks readiness.
(
  set_all
  unset SLACK_WEBHOOK_URL 2>/dev/null || true
  out=$(run_check android env EVENT_NAME=push) || exit 1
  grep -q '^android_ready=true$' <<<"$out" || exit 1
  export SLACK_WEBHOOK_URL=""
  out=$(run_check ios env EVENT_NAME=push) || exit 1
  grep -q '^ios_ready=true$' <<<"$out" || exit 1
) && pass "SLACK_WEBHOOK_URL unset/empty does not block readiness" || fail_count=$((fail_count + 1))

# 9. Fake secret values never appear in any output, success or failure.
(
  set_all
  unset SIGNING_KEY
  combined=$( (run_check android env EVENT_NAME=push; run_check ios env EVENT_NAME=push) 2>&1 || true)
  combined+="$(run_check android env EVENT_NAME=workflow_dispatch 2>&1 || true)"
  if grep -q "$FAKE" <<<"$combined"; then
    echo "FAIL: secret value leaked into output" >&2
    exit 1
  fi
) && pass "secret values never printed" || fail_count=$((fail_count + 1))

# 10. Annotations go to stdout and key=value lines go only to the output file,
#     so ::notice::/::error:: reach the step log and never corrupt GITHUB_OUTPUT.
(
  set_all
  unset SIGNING_KEY
  outfile=$(mktemp)
  stdout=$(OUTPUT_FILE="$outfile" EVENT_NAME=push "$SCRIPT" android)
  grep -q '::notice::Skipping android deploy: missing secrets SIGNING_KEY' <<<"$stdout" || {
    echo "FAIL: notice missing from stdout" >&2
    exit 1
  }
  if grep -q '::' "$outfile"; then
    echo "FAIL: annotation written to the output file" >&2
    exit 1
  fi
  grep -q '^android_ready=false$' "$outfile" || exit 1
  grep -q '^android_missing=SIGNING_KEY$' "$outfile" || exit 1
  if grep -q 'android_ready' <<<"$stdout"; then
    echo "FAIL: key=value lines leaked to stdout" >&2
    exit 1
  fi
  rm -f "$outfile"
) && pass "annotations on stdout, key=value only in the output file" || fail_count=$((fail_count + 1))

# 11. GITHUB_OUTPUT is used when OUTPUT_FILE is unset.
(
  set_all
  outfile=$(mktemp)
  unset OUTPUT_FILE 2>/dev/null || true
  GITHUB_OUTPUT="$outfile" EVENT_NAME=push "$SCRIPT" android >/dev/null
  grep -q '^android_ready=true$' "$outfile" || {
    echo "FAIL: GITHUB_OUTPUT not honoured" >&2
    exit 1
  }
  rm -f "$outfile"
) && pass "GITHUB_OUTPUT honoured when OUTPUT_FILE is unset" || fail_count=$((fail_count + 1))

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed" >&2
  exit 1
fi
echo "all check-secrets tests passed"
