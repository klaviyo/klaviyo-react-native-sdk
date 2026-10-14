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

# expect_fail <case name> <text the guard must print after FAIL:>
expect_fail() {
  if run_guard; then
    report 1 "$1 (guard passed on a broken copy)"
  elif grep -qF "FAIL: $2" "$TMP/out.log"; then
    report 0 "$1"
  else
    report 1 "$1 (guard failed, but not on '$2')"
  fi
}

# mutate <file under TMP> <python snippet using s>: rewrites the file text.
mutate() {
  python3 - "$1" "$2" <<'PY'
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
}

PUB="$TMP/wf/publish-example.yml"
NOTIFY="$TMP/actions/notify-slack-publish/action.yml"

fresh_copy
if run_guard; then report 0 "the guard passes on the real workflows"; else report 1 "the guard passes on the real workflows"; cat "$TMP/out.log"; fi

fresh_copy
mutate "$PUB" "s = s.replace('GOOGLE_SERVICES_JSON: \${{ secrets.GOOGLE_SERVICES_JSON }}', 'GOOGLE_SERVICES_JSON: \${{ substr(secrets.GOOGLE_SERVICES_JSON, 0, 9) }}', 1)"
expect_fail "substr in an expression is caught" "expressions only call functions"

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
