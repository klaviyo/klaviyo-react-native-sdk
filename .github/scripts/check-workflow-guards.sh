#!/usr/bin/env bash
# YAML guards on publish-example.yml that must hold for the publish pipeline
# to be safe. Fails with a list of violations, exit 1.
#
# Guards:
#   1. Every step that posts to Slack on success or warns (⚠️) must be
#      continue-on-error, so a Slack outage never fails an uploaded deploy.
#   2. Every step that stamps build info (sdk-ref.js with --build) or renders
#      notes/Slack (build-release-notes.sh) must draw EVENT_NAME /
#      RELEASE_TAG / COMMIT_SHA / BRANCH from the workflow-level env block,
#      not a per-step copy.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 - "$ROOT" <<'PY'
import sys

import yaml

root = sys.argv[1]
with open(f'{root}/.github/workflows/publish-example.yml') as f:
    workflow = yaml.safe_load(f)

violations = []

top_env = workflow.get('env', {})
shared_keys = ['EVENT_NAME', 'RELEASE_TAG', 'COMMIT_SHA', 'BRANCH']
missing_top = [k for k in shared_keys if k not in top_env]
if missing_top:
    violations.append(f'workflow-level env is missing: {", ".join(missing_top)}')

for job_name, job in workflow.get('jobs', {}).items():
    for step in job.get('steps', []) or []:
        run = step.get('run') or ''
        uses = step.get('uses') or ''
        env = step.get('env', {}) or {}
        name = step.get('name') or uses or '<unnamed>'
        label = f'{job_name}: {name}'

        posts_slack = 'slack-github-action' in uses or 'notify-slack-publish' in uses
        is_failure_notifier = step.get('with', {}).get('result') == 'failure'
        warns = '⚠️' in str(step.get('with', {}))
        if posts_slack and not is_failure_notifier and not step.get('continue-on-error'):
            violations.append(f'{label}: Slack success step without continue-on-error')
        if warns and not step.get('continue-on-error'):
            violations.append(f'{label}: warning step without continue-on-error')

        stamps = 'sdk-ref.js --build' in run
        renders = 'build-release-notes.sh' in run
        if stamps or renders:
            for key in ['EVENT_NAME', 'RELEASE_TAG', 'COMMIT_SHA', 'BRANCH']:
                if key in env:
                    violations.append(f'{label}: redefines shared {key} per step instead of using the workflow env block')

if violations:
    print('workflow guard violations:', file=sys.stderr)
    for v in violations:
        print(f'  {v}', file=sys.stderr)
    sys.exit(1)
print('workflow guards hold')
PY
