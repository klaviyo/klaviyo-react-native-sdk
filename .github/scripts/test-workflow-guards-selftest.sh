#!/usr/bin/env bash
# Self-test for check-workflow-guards.sh: each case breaks a copy of the
# workflows and actions in one way and expects the guard to FAIL on that
# rule. A guard that passes on a broken workflow proves nothing.
# Usage: test-workflow-guards-selftest.sh (run from anywhere)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD="$ROOT/.github/scripts/check-workflow-guards.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

PASSED=0
FAILED=0

report() {
  if [ "$1" -eq 0 ]; then
    echo "PASS: $2"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL: $2"
    FAILED=$((FAILED + 1))
  fi
}

fresh_copy() {
  rm -rf "$TMP/wf" "$TMP/actions" "$TMP/secrets.sh"
  mkdir -p "$TMP/wf" "$TMP/actions"
  cp "$ROOT"/.github/workflows/*.yml "$TMP/wf/"
  cp -R "$ROOT"/.github/actions/. "$TMP/actions/"
  cp "$ROOT/.github/scripts/check-secrets.sh" "$TMP/secrets.sh"
}

run_guard() {
  WORKFLOW_DIR="$TMP/wf" ACTIONS_DIR="$TMP/actions" SECRETS_SCRIPT="$TMP/secrets.sh" \
    bash "$GUARD" >"$TMP/out.log" 2>&1
}

# broken_copy_differs: true when the working copy no longer matches the repo.
broken_copy_differs() {
  ! diff -rq "$ROOT/.github/workflows" "$TMP/wf" >/dev/null 2>&1 \
    || ! diff -rq "$ROOT/.github/actions" "$TMP/actions" >/dev/null 2>&1 \
    || ! diff -q "$ROOT/.github/scripts/check-secrets.sh" "$TMP/secrets.sh" >/dev/null 2>&1
}

# expect_fail <case name> <rule text>: the guard must exit non-zero and print
# a FAIL line containing the rule text anywhere (rules with a job or file
# prefix put it mid-line).
expect_fail() {
  if ! broken_copy_differs; then
    echo "ABORT: '$1' ran the guard on an unmodified copy" >&2
    exit 2
  fi
  if run_guard; then
    report 1 "$1 (guard passed on a broken copy)"
  elif grep -E '^FAIL: ' "$TMP/out.log" | grep -qF -- "$2"; then
    report 0 "$1"
  else
    report 1 "$1 (guard failed, but not on '$2')"
  fi
}

# mutate <file under TMP> <python snippet using s>: rewrites the file text.
# A mutation that changes nothing (the text it targets moved) would let a case
# pass or fail for the wrong reason, so it aborts the whole self-test.
mutate() {
  if ! python3 - "$1" "$2" <<'PY'
import sys

path, code = sys.argv[1], sys.argv[2]
s = open(path).read()
before = s
scope = {'s': s}
exec(code, scope)
if scope['s'] == before:
    sys.exit('mutation did not change the file: ' + code)
open(path, 'w').write(scope['s'])
PY
  then
    echo "ABORT: a self-test mutation no longer changes its target; update the case" >&2
    exit 2
  fi
}

PUB="$TMP/wf/publish-example.yml"
NOTIFY="$TMP/actions/notify-slack-publish/action.yml"

fresh_copy
if run_guard; then report 0 "the guard passes on the real workflows"; else report 1 "the guard passes on the real workflows"; cat "$TMP/out.log"; fi

fresh_copy
mutate "$PUB" "s = s.replace('GOOGLE_SERVICES_JSON: \${{ secrets.GOOGLE_SERVICES_JSON }}', 'GOOGLE_SERVICES_JSON: \${{ substr(secrets.GOOGLE_SERVICES_JSON, 0, 9) }}', 1)"
expect_fail "substr in an expression is caught" "expressions only call functions"

fresh_copy
# A bare job-level if: has no ${{ }} braces; an unknown function there must still be caught.
mutate "$PUB" "
i = s.index('  preflight-ios:')
j = s.index('    if: |\\n', i)
s = s[:j] + '    if: |\\n      substr(github.sha, 0, 7) == \'abc1234\' ||\\n' + s[j + len('    if: |\\n'):]
"
expect_fail "substr in a job-level if without braces is caught" "expressions only call functions"

fresh_copy
# Same for a step-level bare if:.
mutate "$PUB" "
i = s.index('      - name: Clean up keystore')
j = s.index('        if: always()', i)
s = s[:j] + '        if: always() && substring(github.sha, 0, 2) == \'ab\'' + s[j + len('        if: always()'):]
"
expect_fail "substring in a step-level if without braces is caught" "expressions only call functions"

fresh_copy
# An iOS-only run must not start Android's preflight.
mutate "$PUB" "
i = s.index('  preflight-android:')
j = s.index(\"(inputs.platform == 'both' || inputs.platform == 'android')\", i)
s = s[:j] + \"(inputs.platform == 'both' || inputs.platform == 'android' || inputs.platform == 'ios')\" + s[j + len(\"(inputs.platform == 'both' || inputs.platform == 'android')\"):]
"
expect_fail "an Android preflight that also runs for an iOS-only request is caught" "preflight-android runs only when android was requested"

fresh_copy
mutate "$PUB" "
i = s.index('  deploy-ios:')
j = s.index(\"github.event.label.name == 'deploy-example-app:ios'\", i)
s = s[:j] + \"github.event.label.name == 'deploy-example-app:android' || github.event.label.name == 'deploy-example-app:ios'\" + s[j + len(\"github.event.label.name == 'deploy-example-app:ios'\"):]
"
expect_fail "an iOS deploy that also runs for the :android label is caught" "deploy-ios runs only when ios was requested"

fresh_copy
mutate "$PUB" "s = s.replace('\${{ github.event_name }}', '\${{ lower(github.event_name) }}', 1)"
expect_fail "an unknown expression function is caught" "expressions only call functions"

fresh_copy
mutate "$PUB" "
i = s.index('      - name: Notify Slack on success')
j = s.index('        continue-on-error: true\n', i)
s = s[:j] + s[j + len('        continue-on-error: true\n'):]
"
expect_fail "a Slack success step without continue-on-error is caught" "every Slack step except the failure notifier"

fresh_copy
mutate "$PUB" "
i = s.index('      - name: Warn on Slack when What to Test failed')
j = s.index('        continue-on-error: true\n', i)
s = s[:j] + s[j + len('        continue-on-error: true\n'):]
"
expect_fail "a Slack warning step without continue-on-error is caught" "every Slack step except the failure notifier"

fresh_copy
# Slack steps are found by the action they use, not by name: rename one and
# strip its continue-on-error; the guard must still catch it.
mutate "$PUB" "
i = s.index('      - name: Notify Slack on success')
s = s[:i] + s[i:].replace('Notify Slack on success', 'Tell the channel it shipped', 1)
k = s.index('Tell the channel it shipped')
j = s.index('        continue-on-error: true\n', k)
s = s[:j] + s[j + len('        continue-on-error: true\n'):]
"
expect_fail "a renamed Slack step without continue-on-error is still caught" "every Slack step except the failure notifier"

fresh_copy
mutate "$NOTIFY" "s = s.replace('payload-file-path: \${{ steps.message.outputs.payload_file }}', 'payload: |\n          text: \"x\"', 1)"
expect_fail "a YAML payload block is caught" "the Slack payload comes from a JSON file"

fresh_copy
mutate "$PUB" "
i = s.index('  preflight-android:')
j = s.index('      - uses: actions/checkout', i)
k = s.index('      - name: Check secrets', j)
s = s[:j] + s[k:]
"
expect_fail "a preflight job that runs a repo script without a checkout is caught" "publish-example.yml: preflight-android checks out the repository"

fresh_copy
mutate "$PUB" "
i = s.index('  what-to-test:')
j = s.index('      - uses: actions/checkout', i)
k = s.index('      - name: Write App Store Connect API key', j)
s = s[:j] + s[k:]
"
expect_fail "a deploy-side job without a checkout is caught" "publish-example.yml: what-to-test checks out the repository"

fresh_copy
# persist-credentials sits below a ref: line, past any fixed grep window.
mutate "$PUB" "
i = s.index('  preflight-ios:')
j = s.index('      - uses: actions/checkout', i)
k = s.index('        with:\n', j)
m = s.index('          persist-credentials: false\n', k)
block = s[k:m]
s = s[:k] + '        with:\n          ref: \${{ github.sha }}\n          fetch-depth: 0\n          clean: true\n          sparse-checkout: .github\n' + s[m + len('          persist-credentials: false\n'):]
"
expect_fail "a checkout without persist-credentials is caught even with other inputs first" "publish-example.yml: preflight-ios checkout sets persist-credentials"

fresh_copy
mutate "$PUB" "
i = s.index('  preflight-android:')
s = s[:i] + s[i:].replace('    timeout-minutes: 5\n', '    timeout-minutes: 5\n    environment: android-internal-track\n', 1)
"
expect_fail "a preflight that declares an environment is caught" "preflight-android declares no environment"

fresh_copy
mutate "$PUB" "
i = s.index('  preflight-ios:')
s = s[:i] + s[i:].replace('          APPLE_TEAM_ID: \${{ secrets.APPLE_TEAM_ID }}\n', '          APPLE_TEAM_ID: \${{ secrets.APPLE_TEAM_ID }}\n          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}\n', 1)
"
expect_fail "SLACK_WEBHOOK_URL in a preflight is caught" "preflight-ios does not require SLACK_WEBHOOK_URL"

fresh_copy
mutate "$TMP/secrets.sh" "s = s.replace('SERVICE_ACCOUNT_JSON\"', 'SERVICE_ACCOUNT_JSON SLACK_WEBHOOK_URL\"', 1)"
expect_fail "SLACK_WEBHOOK_URL in the required list is caught" "SLACK_WEBHOOK_URL is not in the required-secrets lists"

fresh_copy
mutate "$PUB" "s = s.replace('  COMMIT_SHA: \${{ github.event.pull_request.head.sha || github.sha }}', '  COMMIT_SHA: \${{ github.sha }}', 1)"
expect_fail "using the merge commit is caught" "the commit is the pull request head"

fresh_copy
mutate "$PUB" "s = s.replace('  BRANCH: \${{ github.head_ref || github.ref_name }}', '  BRANCH: \${{ github.ref_name }}', 1)"
expect_fail "using the merge ref name is caught" "the branch is the PR head branch"

fresh_copy
mutate "$PUB" "s = s.replace('  RELEASE_TAG: \${{ github.event.release.tag_name }}\n', '', 1)"
expect_fail "a missing shared RELEASE_TAG is caught" "the workflow-level env defines the shared event fields"

fresh_copy
mutate "$PUB" "
i = s.index('node example/scripts/sdk-ref.js --build')
j = s.rfind('      - name:', 0, i)
k = s.index('        env:\n', j)
s = s[:k] + '        env:\n          RELEASE_TAG: \${{ github.event.release.tag_name }}\n' + s[k + len('        env:\n'):]
"
expect_fail "a stamping step that redefines the shared env is caught" "stamping and notes steps use the shared event env"

fresh_copy
mutate "$NOTIFY" "s = s.replace('github.event.pull_request.head.sha || github.sha', 'github.sha', 1)"
expect_fail "Slack reporting the merge commit is caught" "notify-slack-publish reports the PR head commit"

CI="$TMP/wf/ci.yml"
CHECKS="$TMP/wf/example-publish-checks.yml"
SETUP="$TMP/actions/setup/action.yml"

fresh_copy
mutate "$CI" "s = s.replace('uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5', 'uses: actions/checkout@v5', 1)"
expect_fail "an unpinned checkout in ci.yml (called by the deploy) is caught" "every action in the deploy call tree is pinned"

fresh_copy
mutate "$SETUP" "s = s.replace('actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5', 'actions/setup-node@v5', 1)"
expect_fail "an unpinned action in a composite the deploy uses is caught" "every action in the deploy call tree is pinned"

fresh_copy
mutate "$CHECKS" "s = s.replace('uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5', 'uses: actions/checkout@v5', 1)"
expect_fail "an unpinned action in the called checks workflow is caught" "every action in the deploy call tree is pinned"

fresh_copy
mutate "$PUB" "s = s.replace('uses: google-github-actions/auth@c200f3691d83b41bf9bbd8638997a462592937ed # v2', 'uses: google-github-actions/auth@v2', 1)"
expect_fail "an unpinned action in publish-example.yml is caught" "every action in the deploy call tree is pinned"

fresh_copy
# A tag-looking ref that is not a full SHA (a 7-char abbreviation) is not a pin.
mutate "$CI" "s = s.replace('actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5', 'actions/checkout@fbc6f39 # v5', 1)"
expect_fail "an abbreviated SHA is not accepted as a pin" "every action in the deploy call tree is pinned"

fresh_copy
mutate "$CI" "
i = s.index('  lint:')
j = s.index('          persist-credentials: false\n', i)
s = s[:j] + s[j + len('          persist-credentials: false\n'):]
s = s.replace('        with:\n        - name', '        - name', 1)
"
expect_fail "a ci.yml checkout without persist-credentials is caught" "ci.yml: lint checkout sets persist-credentials"

fresh_copy
# The call tree is derived, not hardcoded: stop calling ci.yml and it drops out.
mutate "$PUB" "
i = s.index('  checks:')
j = s.index('    uses: ./.github/workflows/ci.yml\n', i)
s = s[:j] + '    uses: ./.github/workflows/example-publish-checks.yml\n' + s[j + len('    uses: ./.github/workflows/ci.yml\n'):]
"
expect_fail "a deploy that no longer calls ci.yml is caught" "the deploy call tree includes ci.yml"

fresh_copy
mutate "$PUB" "
i = s.index('  deploy-ios:')
s = s[:i] + s[i:].replace('    needs: [checks, publish-checks, preflight-ios]', '    needs: [preflight-ios]', 1)
"
expect_fail "a deploy that does not wait for the tests is caught" "deploy-ios needs checks and publish-checks"

fresh_copy
mutate "$PUB" "
i = s.index('  checks:')
j = s.index('    if: |', i)
k = s.index('    permissions:', j)
s = s[:j] + s[k:]
"
expect_fail "checks that run on every label are caught" "checks only runs for deploy-capable triggers"

fresh_copy
mutate "$PUB" "
i = s.index('  deploy-android:')
s = s[:i] + s[i:].replace('github.event.pull_request.head.repo.full_name == github.repository && ', '', 1)
"
expect_fail "a label deploy open to fork pull requests is caught" "label deploys are limited to same-repo pull requests"

fresh_copy
mutate "$PUB" "
i = s.index('        id: save_notes\n        continue-on-error: true\n')
s = s.replace('        id: save_notes\n        continue-on-error: true\n', '        id: save_notes\n', 1)
"
expect_fail "a what-to-test step that can fail the run is caught" "the what-to-test job cannot fail the run"

echo
echo "SUMMARY: $PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
