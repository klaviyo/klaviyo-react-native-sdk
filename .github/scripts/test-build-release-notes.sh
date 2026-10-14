#!/usr/bin/env bash
# Runs build-release-notes.sh, and the per-attempt sdk-ref.js stamp commands,
# with the environment the Android deploy step
# really has (the workflow-level shared env plus the step's own), so a
# variable the script needs but the workflow never sets fails here instead
# of producing a blank source label in a store note. The shared env is read
# from publish-example.yml itself and every ${{ }} expression is evaluated
# for a given event by a small fixture table.
# Backs up and restores the real example/.env.
# Usage: test-build-release-notes.sh (run from the repo root)
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

# shared_env <event>: prints KEY=VALUE for every key in the workflow-level
# env block, with the GitHub expressions evaluated for the given event.
shared_env() {
  python3 - "$1" <<'PY'
import re
import sys

import yaml

event = sys.argv[1]
wf = yaml.safe_load(open('.github/workflows/publish-example.yml'))

ctx = {
    'github.event_name': event,
    'github.event.release.tag_name': 'v2.6.0-rc.1' if event == 'release' else '',
    'github.event.pull_request.head.sha': 'cafe1234cafe1234cafe1234cafe1234cafe1234' if event == 'pull_request' else '',
    'github.sha': 'abcd5678abcd5678abcd5678abcd5678abcd5678',
    'github.head_ref': 'ecm/MAGE-1075/continuous-deployment' if event == 'pull_request' else '',
    'github.ref_name': '429/merge' if event == 'pull_request' else ('v2.6.0-rc.1' if event == 'release' else 'rel/2.6.0'),
}


def evaluate(expr):
    # Supports `a || b || ...` over context keys, which is all the shared env uses.
    for part in (p.strip() for p in expr.split('||')):
        if part not in ctx:
            raise SystemExit(f'unsupported expression in shared env: {part}')
        if ctx[part]:
            return ctx[part]
    return ''


for key, value in (wf.get('env') or {}).items():
    m = re.fullmatch(r'\$\{\{\s*(.*?)\s*\}\}', str(value))
    print(f'{key}={evaluate(m.group(1)) if m else value}')
PY
}

# generate_env <commit> <branch>: stamps example/.env. The branch stamped here
# is deliberately NOT the expected source label for the cases below, so a
# label that only appears through the generator's fallback to the stamped
# branch fails instead of passing by accident.
generate_env() {
  node example/scripts/sdk-ref.js --build 7 --commit "$1" --branch "stamped-branch-not-the-label" \
    --built "2026-10-14 02:00 UTC" >/dev/null
}

# run_notes <event>: runs the script under the shared env for the event plus
# the Android step's own variables; stdout is the notes.
run_notes() {
  local event=$1 line
  local -a vars=()
  while IFS= read -r line; do vars+=("$line"); done < <(shared_env "$event")
  env -i PATH="$PATH" HOME="$HOME" "${vars[@]}" \
    RUN_URL="https://github.com/o/r/actions/runs/1" \
    RELEASE_NAME="v2.6.0-rc.1" RELEASE_BODY="Release body text" \
    .github/scripts/build-release-notes.sh android 4000
}

# 1. Label deploy: the source is the PR head branch, never "429/merge" or blank.
generate_env cafe1234cafe1234 ecm/MAGE-1075/continuous-deployment
notes=$(run_notes pull_request)
if grep -qF 'Commit: cafe123 on ecm/MAGE-1075/continuous-deployment (pull_request)' <<<"$notes"; then
  pass "label deploy: source label is the PR head branch"
else
  fail "label deploy: wrong or blank source label in: $(grep -m1 'Commit:' <<<"$notes")"
fi
if grep -qF '429/merge' <<<"$notes"; then fail "label deploy: merge ref name leaked into the notes"; else pass "label deploy: no <n>/merge in the notes"; fi

# 2. Push to a release branch: the source is the branch.
generate_env abcd5678abcd5678 rel/2.6.0
notes=$(run_notes push)
if grep -qF 'Commit: abcd567 on rel/2.6.0 (push)' <<<"$notes"; then
  pass "push: source label is the branch"
else
  fail "push: wrong or blank source label in: $(grep -m1 'Commit:' <<<"$notes")"
fi

# 3. Release: the source is "release <tag>" and the body is appended.
generate_env abcd5678abcd5678 v2.6.0-rc.1
notes=$(run_notes release)
if grep -qF 'Commit: abcd567 on release v2.6.0-rc.1 (release)' <<<"$notes"; then
  pass "release: source label is release <tag>"
else
  fail "release: wrong or blank source label in: $(grep -m1 'Commit:' <<<"$notes")"
fi
if grep -qF 'Release body text' <<<"$notes"; then pass "release: body is appended"; else fail "release: body missing"; fi

# 3b. The step that STAMPS commit/branch into the app must receive the PR head
#     SHA and head branch under a label-deploy env, never the merge commit or
#     "<n>/merge". The stamping command lines are taken from the workflow
#     itself (every `node .../sdk-ref.js --build ...` line), run with the
#     event's shared env, so a changed or dropped argument fails here. The
#     merge SHA and ref name differ from the head values on purpose.
stamp_commands() {
  python3 - <<'PY'
import re

import yaml

wf = yaml.safe_load(open('.github/workflows/publish-example.yml'))
for job in ('deploy-android', 'deploy-ios'):
    for step in wf['jobs'][job]['steps']:
        for line in str(step.get('run') or '').splitlines():
            if re.search(r'sdk-ref\.js --build', line):
                print(f'{job}\t{line.strip()}')
PY
}

# run_stamp <event> <command line>: runs one stamping line under the event's
# shared env plus the step's own variables, writing a scratch .env.
run_stamp() {
  local event=$1 cmd=$2 line
  local -a vars=()
  while IFS= read -r line; do vars+=("$line"); done < <(shared_env "$event")
  # The workflow runs iOS stamping from example/ (scripts/sdk-ref.js) and
  # Android from the repo root; both resolve to the same script here.
  cmd=${cmd//node scripts\/sdk-ref.js/node example\/scripts\/sdk-ref.js}
  # GITHUB_REF_NAME and GITHUB_SHA carry the merge-ref values a real label
  # deploy runner has ("429/merge", the merge commit), and GITHUB_HEAD_REF is
  # absent, so a --branch that is dropped or empty falls through to the wrong
  # answer instead of a lucky one. The stamp runs from a directory outside any
  # git checkout for the same reason.
  local scratch
  scratch=$(mktemp -d)
  mkdir -p "$scratch/example"
  cp -R "$REPO_ROOT/example/scripts" "$scratch/example/scripts"
  cp "$REPO_ROOT/package.json" "$scratch/package.json"
  mkdir -p "$scratch/android" "$scratch/ios"
  cp "$REPO_ROOT/android/gradle.properties" "$scratch/android/" 2>/dev/null || true
  cp "$REPO_ROOT/klaviyo-react-native-sdk.podspec" "$scratch/" 2>/dev/null || true
  (cd "$scratch" && env -i PATH="$PATH" HOME="$HOME" "${vars[@]}" \
    GITHUB_REF_NAME="429/merge" GITHUB_SHA="abcd5678abcd5678abcd5678abcd5678abcd5678" \
    VERSION_CODE=7 BUILD_NUMBER=7 BUILT_AT="2026-10-14 02:00 UTC" \
    bash -c "$cmd" >/dev/null)
  local status=$?
  STAMPED_ENV="$scratch/example/.env"
  return "$status"
}

stamp_count=0
while IFS=$'\t' read -r job cmd; do
  [ -z "$job" ] && continue
  stamp_count=$((stamp_count + 1))
  if ! run_stamp pull_request "$cmd"; then
    fail "label deploy stamp ($job): the stamp command failed: $cmd"
    continue
  fi
  stamped_commit=$(grep '^KLAVIYO_BUILD_COMMIT=' "$STAMPED_ENV" | cut -d= -f2-)
  stamped_branch=$(grep '^KLAVIYO_BUILD_BRANCH=' "$STAMPED_ENV" | cut -d= -f2-)
  if [ "$stamped_commit" = "cafe123" ]; then
    pass "label deploy stamp ($job): commit is the PR head sha"
  else
    fail "label deploy stamp ($job): commit is '$stamped_commit', expected the PR head cafe123 (merge commit is abcd567)"
  fi
  if [ "$stamped_branch" = "ecm/MAGE-1075/continuous-deployment" ]; then
    pass "label deploy stamp ($job): branch is the PR head branch"
  else
    fail "label deploy stamp ($job): branch is '$stamped_branch', expected the PR head branch (not 429/merge)"
  fi
done < <(stamp_commands)
if [ "$stamp_count" -lt 2 ]; then
  fail "expected a stamping command in both deploy jobs, found $stamp_count"
else
  pass "both deploy jobs stamp build info per attempt"
fi

# 4. Every variable the script reads exists in the shared env or is supplied
#    by the step (guards a variable added to the script but not the workflow).
reads=$(grep -o -w -E 'EVENT_NAME|RELEASE_TAG|HEAD_REF|REF_NAME|RUN_URL|RELEASE_NAME|RELEASE_BODY' .github/scripts/build-release-notes.sh | sort -u)
provided="$(shared_env push | cut -d= -f1) RUN_URL RELEASE_NAME RELEASE_BODY"
for v in $reads; do
  if grep -qw "$v" <<<"$provided"; then pass "$v is provided to the notes step"; else fail "$v is read by build-release-notes.sh but not provided by the workflow"; fi
done

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed"
  exit 1
fi
echo "all build-release-notes tests passed"
