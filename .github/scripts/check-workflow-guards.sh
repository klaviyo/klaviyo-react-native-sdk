#!/usr/bin/env bash
# Static guards on the publish workflow and its composite actions: bugs that
# actionlint accepts and that only fail at runtime or after merge. Parses the
# YAML (PyYAML) instead of slicing text, so results do not depend on the awk
# or sed dialect of the runner. Prints one PASS/FAIL line per rule and exits
# non-zero if any rule fails.
#
# The workflows and composite actions that run in the deploy (publish-example.yml
# plus every workflow it calls, recursively, and every local action any of them
# uses) are all held to the same pin and checkout rules; the set is derived from
# the workflow itself, so a newly called workflow is covered automatically.
#
# Usage:
#   check-workflow-guards.sh                  run every guard
#   check-workflow-guards.sh --list-workflows print the workflow files in the
#                                             deploy's call tree, one per line
#                                             (paths relative to the repo root),
#                                             so CI lints exactly those
#
# Env (overridden by test-workflow-guards-selftest.sh, which breaks a copy of
# the workflows once per rule and expects a FAIL):
#   WORKFLOW_DIR    directory with publish-example.yml and the other workflows
#                   (default .github/workflows)
#   ACTIONS_DIR     directory holding the composite actions
#                   (default .github/actions)
#   SECRETS_SCRIPT  path to check-secrets.sh (default .github/scripts)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export WORKFLOW_DIR="${WORKFLOW_DIR:-$ROOT/.github/workflows}"
export ACTIONS_DIR="${ACTIONS_DIR:-$ROOT/.github/actions}"
export SECRETS_SCRIPT="${SECRETS_SCRIPT:-$ROOT/.github/scripts/check-secrets.sh}"

python3 - "${1:-}" <<'PY'
import glob
import os
import re
import sys

import yaml

workflow_dir = os.environ['WORKFLOW_DIR']
actions_dir = os.environ['ACTIONS_DIR']
secrets_script = os.environ['SECRETS_SCRIPT']

failures = 0


def passed(name):
    print(f'PASS: {name}')


def failed(name, detail=''):
    global failures
    failures += 1
    print(f'FAIL: {name}')
    for line in str(detail).strip().splitlines():
        print(f'  | {line}')


def check(name, ok, detail=''):
    if ok:
        passed(name)
    else:
        failed(name, detail)


def load(path):
    with open(path) as f:
        return yaml.safe_load(f)


def read(path):
    with open(path) as f:
        return f.read()


publish = load(os.path.join(workflow_dir, 'publish-example.yml'))
jobs = publish['jobs']
workflow_files = sorted(glob.glob(os.path.join(workflow_dir, '*.yml')))
action_files = sorted(
    glob.glob(os.path.join(actions_dir, '**', 'action.yml'), recursive=True)
)
notify_path = os.path.join(actions_dir, 'notify-slack-publish', 'action.yml')
notes_path = os.path.join(actions_dir, 'example-release-notes', 'action.yml')


def steps_of(job):
    return job.get('steps') or []


def deploy_call_tree():
    # Workflows reached from publish-example.yml through
    # `uses: ./.github/workflows/<file>`, and the local actions used by any of
    # them (`uses: ./.github/actions/<name>`), found recursively.
    workflows = {'publish-example.yml'}
    actions = set()
    pending = ['publish-example.yml']
    while pending:
        name = pending.pop()
        path = os.path.join(workflow_dir, name)
        if not os.path.exists(path):
            continue
        doc = load(path)
        for job in (doc.get('jobs') or {}).values():
            uses = [str(job.get('uses') or '')] + [str(st.get('uses') or '') for st in steps_of(job)]
            for u in uses:
                m = re.match(r'\./\.github/workflows/([^@\s]+)', u)
                if m and m.group(1) not in workflows:
                    workflows.add(m.group(1))
                    pending.append(m.group(1))
                m = re.match(r'\./\.github/actions/([^@\s/]+)', u)
                if m:
                    actions.add(m.group(1))
    # Actions can use other local actions.
    changed = True
    while changed:
        changed = False
        for a in sorted(actions):
            apath = os.path.join(actions_dir, a, 'action.yml')
            if not os.path.exists(apath):
                continue
            for st in (load(apath).get('runs') or {}).get('steps') or []:
                m = re.match(r'\./\.github/actions/([^@\s/]+)', str(st.get('uses') or ''))
                if m and m.group(1) not in actions:
                    actions.add(m.group(1))
                    changed = True
    return sorted(workflows), sorted(actions)


if len(sys.argv) > 1 and sys.argv[1] == '--list-workflows':
    for name in deploy_call_tree()[0]:
        print(f'.github/workflows/{name}')
    sys.exit(0)


def step_label(job_name, step):
    return f"{job_name}: {step.get('name') or step.get('uses') or step.get('id') or '<unnamed>'}"


def all_steps(doc):
    if 'jobs' in doc:
        for job_name, job in doc['jobs'].items():
            for step in steps_of(job):
                yield job_name, step
    else:
        for step in (doc.get('runs') or {}).get('steps') or []:
            yield 'action', step


# 1. Only functions GitHub Actions provides may be called inside ${{ }}; an
#    unknown one fails when the expression evaluates, after merge.
ALLOWED = {
    'contains', 'startsWith', 'endsWith', 'format', 'join', 'toJSON',
    'fromJSON', 'hashFiles', 'case', 'success', 'always', 'cancelled', 'failure',
}


def if_values(node):
    # `if:` values are expressions even without ${{ }}, so they are scanned
    # too (job and step level, workflows and composite actions).
    if isinstance(node, dict):
        for key, value in node.items():
            if key == 'if' and isinstance(value, str):
                yield value
            yield from if_values(value)
    elif isinstance(node, list):
        for item in node:
            yield from if_values(item)


def functions_in(expression):
    # Calls inside quoted string literals are text, not function calls.
    expression = re.sub(r"'[^']*'", "''", expression)
    return re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*\(', expression)


unknown = set()
for path in workflow_files + action_files:
    for expr in re.findall(r'\$\{\{.*?\}\}', read(path), flags=re.DOTALL):
        unknown |= {fn for fn in functions_in(expr) if fn not in ALLOWED}
    for value in if_values(load(path)):
        unknown |= {fn for fn in functions_in(value) if fn not in ALLOWED}
check('expressions only call functions that GitHub Actions provides',
      not unknown, f'unsupported: {", ".join(sorted(unknown))}')

# 2. A Slack step other than the failure notifier tolerates failure, so a
#    Slack problem never fails a deploy that already uploaded.
slack_missing = []
for job_name, job in jobs.items():
    for step in steps_of(job):
        uses = str(step.get('uses') or '')
        if 'notify-slack-publish' not in uses and 'slack-github-action' not in uses:
            continue
        if (step.get('with') or {}).get('result') == 'failure':
            continue
        if not step.get('continue-on-error'):
            slack_missing.append(step_label(job_name, step))
check('every Slack step except the failure notifier has continue-on-error',
      not slack_missing, '\n'.join(slack_missing))

# 3. No YAML `payload:` input anywhere; multiline Slack text would break it.
payload_blocks = []
for path in workflow_files + action_files:
    for where, step in all_steps(load(path)):
        if 'payload' in (step.get('with') or {}):
            payload_blocks.append(f'{os.path.basename(path)}: {where}')
check('the Slack payload comes from a JSON file, not a YAML payload block',
      not payload_blocks, '\n'.join(payload_blocks))


# 4. Every job that runs a repo script or a local action checks the repo out
#    first, and every checkout sets persist-credentials: false. The `with:`
#    block is parsed, so the key can sit anywhere in it.
def runs_repo_code(step):
    run = str(step.get('run') or '')
    uses = str(step.get('uses') or '')
    return bool(
        re.search(r'\.github/scripts/|\bnode example/|\bpack-and-test\.sh', run)
        or uses.startswith('./')
    )


def is_checkout(step):
    return str(step.get('uses') or '').startswith('actions/checkout@')




GUARDED_WORKFLOWS, GUARDED_ACTIONS = deploy_call_tree()
check('the deploy call tree includes ci.yml and example-publish-checks.yml',
      {'ci.yml', 'example-publish-checks.yml'} <= set(GUARDED_WORKFLOWS),
      f'found: {GUARDED_WORKFLOWS}')

# Every third-party action in the call tree is pinned to a full commit SHA.
SHA_PIN = re.compile(r'@[0-9a-f]{40}(\s|$)')
unpinned = []
for name in GUARDED_WORKFLOWS:
    path = os.path.join(workflow_dir, name)
    if not os.path.exists(path):
        continue
    for job_name, job in (load(path).get('jobs') or {}).items():
        for use in [job.get('uses')] + [st.get('uses') for st in steps_of(job)]:
            use = str(use or '')
            if use and not use.startswith('./') and not SHA_PIN.search(use + ' '):
                unpinned.append(f'{name}: {job_name}: {use}')
for name in GUARDED_ACTIONS:
    apath = os.path.join(actions_dir, name, 'action.yml')
    if not os.path.exists(apath):
        continue
    for st in (load(apath).get('runs') or {}).get('steps') or []:
        use = str(st.get('uses') or '')
        if use and not use.startswith('./') and not SHA_PIN.search(use + ' '):
            unpinned.append(f'action {name}: {use}')
check('every action in the deploy call tree is pinned to a full commit SHA',
      not unpinned, '\n'.join(unpinned))

for path in workflow_files:
    if os.path.basename(path) not in GUARDED_WORKFLOWS:
        continue
    doc = load(path)
    for job_name, job in (doc.get('jobs') or {}).items():
        if 'uses' in job:
            continue
        steps = steps_of(job)
        first_use = next((i for i, s in enumerate(steps) if runs_repo_code(s)), None)
        if first_use is not None:
            first_checkout = next((i for i, s in enumerate(steps) if is_checkout(s)), None)
            check(f'{os.path.basename(path)}: {job_name} checks out the repository before using it',
                  first_checkout is not None and first_checkout <= first_use)
        for step in steps:
            if is_checkout(step):
                check(f'{os.path.basename(path)}: {job_name} checkout sets persist-credentials: false',
                      (step.get('with') or {}).get('persist-credentials') is False)

# 5. The preflight jobs read repository-level secrets, so they declare no
#    environment, and SLACK_WEBHOOK_URL (optional) is not required by them or
#    by the secrets script.
for name in ('preflight-android', 'preflight-ios'):
    job = jobs[name]
    check(f'{name} declares no environment', 'environment' not in job)
    env_names = set()
    for step in steps_of(job):
        env_names |= set((step.get('env') or {}).keys())
    check(f'{name} does not require SLACK_WEBHOOK_URL', 'SLACK_WEBHOOK_URL' not in env_names)
required_lines = [
    line for line in read(secrets_script).splitlines()
    if re.match(r'^(ANDROID|IOS)_REQUIRED=', line)
]
check('SLACK_WEBHOOK_URL is not in the required-secrets lists',
      bool(required_lines) and not any('SLACK_WEBHOOK_URL' in l for l in required_lines),
      '\n'.join(required_lines) or 'no *_REQUIRED lists found')

# 6. Stamping and notes steps use the workflow-level event env, never a
#    per-step copy, and the commit and branch are the PR head's, not the
#    merge ref's.
top_env = publish.get('env') or {}
missing = [k for k in ('EVENT_NAME', 'RELEASE_TAG', 'COMMIT_SHA', 'BRANCH') if k not in top_env]
check('the workflow-level env defines the shared event fields',
      not missing, f'missing: {", ".join(missing)}')
check('the commit is the pull request head, not the merge commit',
      'github.event.pull_request.head.sha' in str(top_env.get('COMMIT_SHA', '')),
      f"COMMIT_SHA is {top_env.get('COMMIT_SHA')!r}")
check('the branch is the PR head branch, not <n>/merge',
      'github.head_ref' in str(top_env.get('BRANCH', '')),
      f"BRANCH is {top_env.get('BRANCH')!r}")
redefined = []
for job_name, job in jobs.items():
    for step in steps_of(job):
        run = str(step.get('run') or '')
        if 'sdk-ref.js --build' in run or 'build-release-notes.sh' in run:
            for key in ('EVENT_NAME', 'RELEASE_TAG', 'COMMIT_SHA', 'BRANCH'):
                if key in (step.get('env') or {}):
                    redefined.append(f'{step_label(job_name, step)} redefines {key}')
check('stamping and notes steps use the shared event env',
      not redefined, '\n'.join(redefined))
for path in (notify_path, notes_path):
    text = read(path)
    check(f'{os.path.basename(os.path.dirname(path))} reports the PR head commit',
          'github.event.pull_request.head.sha' in text
          and 'COMMIT_SHA: ${{ github.sha }}' not in text)

# 7. Deploys wait for the tests; other triggers never start the expensive jobs.
for name in ('deploy-android', 'deploy-ios'):
    needs = jobs[name].get('needs') or []
    needs = [needs] if isinstance(needs, str) else needs
    check(f'{name} needs checks and publish-checks',
          {'checks', 'publish-checks'} <= set(needs), f'needs: {needs}')
for name in ('checks', 'publish-checks'):
    cond = str(jobs[name].get('if') or '')
    check(f'{name} only runs for deploy-capable triggers',
          'startsWith(github.event.label.name' in cond and 'pull_request' in cond, cond)

# 8. A label deploy starts only for same-repo pull requests, so a fork PR
#    cannot reach store secrets, on every job that reads the label.
same_repo = 'github.event.pull_request.head.repo.full_name == github.repository'
unguarded = [
    name for name, job in jobs.items()
    if "github.event_name == 'pull_request'" in str(job.get('if') or '')
    and same_repo not in str(job.get('if') or '')
]
check('label deploys are limited to same-repo pull requests',
      not unguarded, ', '.join(unguarded))

# 9. Each platform's preflight and deploy run only when that platform was
#    requested (dispatch input or label suffix), so an iOS-only run never
#    checks or fails on Android's secrets, and the reverse.
for platform, other in (('android', 'ios'), ('ios', 'android')):
    for name in (f'preflight-{platform}', f'deploy-{platform}'):
        cond = str(jobs[name].get('if') or '')
        ok = (
            f"inputs.platform == '{platform}'" in cond
            and f"github.event.label.name == 'deploy-example-app:{platform}'" in cond
            and f"'{other}'" not in cond
            and f"deploy-example-app:{other}" not in cond
        )
        check(f'{name} runs only when {platform} was requested', ok, cond)

# 10. The what-to-test job cannot fail the run: every step other than the
#    checkout and the always() cleanup tolerates failure.
fragile = []
for step in steps_of(jobs['what-to-test']):
    if is_checkout(step) or str(step.get('if') or '').strip() == 'always()':
        continue
    if not step.get('continue-on-error'):
        fragile.append(step.get('name') or step.get('uses'))
check('the what-to-test job cannot fail the run',
      not fragile, '\n'.join(str(f) for f in fragile))

print()
if failures:
    print(f'{failures} guard(s) failed')
    sys.exit(1)
print('All guards passed')
PY
