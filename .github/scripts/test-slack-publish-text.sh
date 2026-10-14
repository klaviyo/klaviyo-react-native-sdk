#!/usr/bin/env bash
# Tests for slack-publish-text.sh: success forms (branch, release,
# prerelease, missing values, ref == version) and the failure form.
# Usage: test-slack-publish-text.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/slack-publish-text.sh"

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

check() { # name haystack needle
  if grep -qF -- "$3" <<<"$2"; then
    pass "$1"
  else
    fail "$1: missing '$3' in:
$2"
  fi
}

BASE=(
  RESULT=success PLATFORM=iOS STORE=TestFlight
  FULL_VERSION=2.6.0 BUILD=12
  RN_VERSION=2.6.0 RN_REF=master@abc1234
  NATIVE_NAME=iOS NATIVE_VERSION=5.4.1 NATIVE_REF=5.4.1
  SOURCE_LABEL=master EVENT_NAME=push
  COMMIT_SHA=abc1234deadbeef REPO=klaviyo/klaviyo-react-native-sdk
  RUN_URL=https://github.com/klaviyo/klaviyo-react-native-sdk/actions/runs/1
  INSTALL_URL=https://beta.itunes.apple.com/v1/app/123
  INSTALL_LABEL='Open the example app in TestFlight'
  INSTALL_FALLBACK= ACCESS_NOTE=
)

# Branch build: ref != version shows both; native ref == version omits ref.
out=$(env "${BASE[@]}" "$SCRIPT")
check "branch: headline" "$out" '✅ RN Example (iOS) → TestFlight'
check "branch: build line" "$out" '*Build:* 2.6.0 (12)'
check "branch: rn sdk with ref" "$out" '*SDKs:* RN 2.6.0 · master@abc1234 | iOS 5.4.1'
check "branch: source" "$out" '*Source:* master (push)'
check "branch: commit link + short sha" "$out" '*Commit:* <https://github.com/klaviyo/klaviyo-react-native-sdk/commit/abc1234deadbeef|abc1234> · <https://github.com/klaviyo/klaviyo-react-native-sdk/actions/runs/1|CI run>'
check "branch: get the build" "$out" '*Get the build:* <https://beta.itunes.apple.com/v1/app/123|Open the example app in TestFlight>'
if grep -q '`' <<<"$out"; then
  fail "branch: backticks present"
else
  pass "branch: no backticks"
fi

# A native ref that embeds the version reduces to its ref part.
out=$(env "${BASE[@]}" NATIVE_VERSION=5.4.1 NATIVE_REF='5.4.1 (252a62e)' "$SCRIPT")
check "embedded version: ref part only" "$out" '| iOS 5.4.1 · 252a62e'
if grep -qF '5.4.1 · 5.4.1' <<<"$out"; then fail "embedded version: version repeated"; else pass "embedded version: version not repeated"; fi

# Ref names may hold mrkdwn control characters; none reach the message.
out=$(env "${BASE[@]}" RN_REF='x<!channel>|a&b`c' NATIVE_REF='<!here>' "$SCRIPT")
sdks_line=$(grep -F '*SDKs:*' <<<"$out" | sed 's/ | / /')
if grep -qE '[<>&|!`]' <<<"$sdks_line"; then fail "hostile refs: control characters in the SDKs line"; else pass "hostile refs: no control characters in the SDKs line"; fi
check "hostile refs: safe remainder kept" "$out" 'RN 2.6.0 · xchannelabc'

# A local-checkout ref keeps its colon.
out=$(env "${BASE[@]}" RN_REF='local:master@abc1234-dirty' "$SCRIPT")
check "local ref: colon kept" "$out" 'RN 2.6.0 · local:master@abc1234-dirty'

# Release build.
out=$(env "${BASE[@]}" SOURCE_LABEL='release v2.6.0' EVENT_NAME=release "$SCRIPT")
check "release: source label" "$out" '*Source:* release v2.6.0 (release)'

# Prerelease version shows the full string.
out=$(env "${BASE[@]}" FULL_VERSION=2.6.0-rc.1 RN_VERSION=2.6.0-rc.1 RN_REF=ecm/MAGE-1075/continuous-deployment SOURCE_LABEL=ecm/MAGE-1075/continuous-deployment EVENT_NAME=pull_request "$SCRIPT")
check "prerelease: full version in build line" "$out" '*Build:* 2.6.0-rc.1 (12)'
check "prerelease: rn ref shown" "$out" 'RN 2.6.0-rc.1 · ecm/MAGE-1075/continuous-deployment'

# Missing values render as em-dash; missing install link falls back.
out=$(env "${BASE[@]}" RN_VERSION= RN_REF= NATIVE_VERSION= NATIVE_REF= INSTALL_URL= INSTALL_FALLBACK='Internal App Sharing upload failed, see the workflow run' PLATFORM=Android STORE='Play internal' NATIVE_NAME=Android "$SCRIPT")
check "missing: rn dash" "$out" '*SDKs:* RN — | Android —'
check "missing: fallback text" "$out" '*Get the build:* Internal App Sharing upload failed, see the workflow run'

# Access note appends to the install link.
out=$(env "${BASE[@]}" ACCESS_NOTE='Install once Apple finishes processing' "$SCRIPT")
check "access note appended" "$out" '*Get the build:* <https://beta.itunes.apple.com/v1/app/123|Open the example app in TestFlight> — Install once Apple finishes processing'

# Failure form names the failed step.
out=$(env "${BASE[@]}" RESULT=failure FAILED_STEP='Build, sign & upload to TestFlight' INSTALL_URL= "$SCRIPT")
check "failure: headline with step" "$out" '❌ RN Example (iOS) deploy failed at Build, sign & upload to TestFlight'
check "failure: build line" "$out" '*Build:* 2.6.0 (12)'
check "failure: ci run link" "$out" '|CI run>'
if grep -q 'Get the build' <<<"$out"; then
  fail "failure: install line present"
else
  pass "failure: no install line"
fi

# Warning form: uploaded, but What to Test failed; no install or SDK lines.
out=$(env "${BASE[@]}" RESULT=warning "$SCRIPT")
check "warning: headline" "$out" '⚠️ RN Example (iOS) → TestFlight: uploaded, but setting What to Test failed'
check "warning: build line" "$out" '*Build:* 2.6.0 (12)'
check "warning: run link" "$out" '<https://github.com/klaviyo/klaviyo-react-native-sdk/actions/runs/1|CI run>'
if grep -q -e 'Get the build' -e '✅' -e '❌' <<<"$out"; then
  fail "warning: carries success/failure/install content"
else
  pass "warning: no install line or other result icons"
fi

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed" >&2
  exit 1
fi
echo "all slack-publish-text tests passed"
