#!/usr/bin/env bash
# Tests for failed-step.sh.
# Usage: test-failed-step.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/failed-step.sh"

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

expect_eq() {
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1: expected '$2' got '$3'"; fi
}

expect_eq "first failed step is named" "build deploy" \
  "$("$SCRIPT" '{"checkout":{"outcome":"success","conclusion":"success"},"build_deploy":{"outcome":"failure","conclusion":"failure"},"later":{"outcome":"failure","conclusion":"failure"}}')"
expect_eq "skipped and cancelled steps are not failures" "unknown step" \
  "$("$SCRIPT" '{"a":{"outcome":"skipped","conclusion":"skipped"},"b":{"outcome":"cancelled","conclusion":"cancelled"},"c":{"outcome":"success","conclusion":"success"}}')"
expect_eq "success only" "unknown step" "$("$SCRIPT" '{"a":{"outcome":"success","conclusion":"success"}}')"
# A continue-on-error step that failed has outcome=failure, conclusion=success:
# it must not be reported, and the later hard failure must be.
expect_eq "a continue-on-error failure is not the failed step" "build deploy" \
  "$("$SCRIPT" '{"internal_sharing":{"outcome":"failure","conclusion":"success"},"build_deploy":{"outcome":"failure","conclusion":"failure"}}')"
expect_eq "only a continue-on-error failure leaves unknown step" "unknown step" \
  "$("$SCRIPT" '{"internal_sharing":{"outcome":"failure","conclusion":"success"}}')"
expect_eq "empty context" "unknown step" "$("$SCRIPT" '{}')"
expect_eq "empty argument" "unknown step" "$("$SCRIPT" '')"
expect_eq "no argument" "unknown step" "$("$SCRIPT")"
expect_eq "invalid JSON" "unknown step" "$("$SCRIPT" 'not json')"

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed"
  exit 1
fi
echo "All failed-step tests passed"
