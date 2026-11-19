# Shared SDK CI

CI pieces used by all five Klaviyo mobile SDKs: klaviyo-android-sdk, klaviyo-swift-sdk, klaviyo-react-native-sdk, klaviyo-flutter-sdk and klaviyo-expo-plugin. Other SDKs call them at `@master`. This repo calls them by local path.

| Piece                                       | Kind              | Path                                      |
| ------------------------------------------- | ----------------- | ----------------------------------------- |
| [notify-slack](#notify-slack)               | composite action  | `.github/shared/notify-slack`             |
| [promotion-check](#promotion-check)         | composite action  | `.github/shared/promotion-check`          |
| [pr-target-check](#pr-target-check)         | composite action  | `.github/shared/pr-target-check`          |
| [linear-release-sync](#linear-release-sync) | composite action  | `.github/shared/linear-release-sync`      |
| [stale](#stale)                             | composite action  | `.github/shared/stale`                    |
| [remove-deploy-label](#remove-deploy-label) | composite action  | `.github/shared/remove-deploy-label`      |
| [release-preflight](#release-preflight)     | callable workflow | `.github/workflows/release-preflight.yml` |
| [rel-branch-core](#rel-branch-core)         | callable workflow | `.github/workflows/rel-branch-core.yml`   |

## Changing the contract

Every SDK runs whatever is on `master` here, so a change lands in all five at once.

- Inputs are additive. A new input is optional and its default keeps today's behavior.
- To rename an input, accept both names until every caller uses the new one.
- A breaking change (removed input, changed default, changed output) updates every caller in one batch, merged together.
- Composite actions can't read secrets. Callers pass tokens as inputs. Callable workflows read them through `secrets: inherit`.

## notify-slack

Posts, updates or replies to a Slack message as the MAGE CI bot. It never fails the calling job. Full input table: [notify-slack/README.md](notify-slack/README.md).

| Input        | Required | Default                                                                |
| ------------ | -------- | ---------------------------------------------------------------------- |
| `token`      | no       | `''` (empty skips with a notice)                                       |
| `channel`    | no       | `C08HFEC8W9W`                                                          |
| `status`     | no       | `info` (`pending`, `success`, `failure`, `stopped`, `warning`, `info`) |
| `title`      | yes      |                                                                        |
| `body`       | no       | `''`                                                                   |
| `fields`     | no       | `''` (lines of `Label: value`)                                         |
| `links`      | no       | `''` (lines of `Label\|URL`)                                           |
| `ts`         | no       | `''` (update this message)                                             |
| `thread_ts`  | no       | `''` (reply in this thread)                                            |
| `mention`    | no       | `''`                                                                   |
| `username`   | no       | `$SLACK_USERNAME`, else `MAGE CI`                                      |
| `icon_emoji` | no       | `$SLACK_ICON_EMOJI`, else `:crystal_ball:`                             |

Outputs: `ts`, `channel`. Permissions: none. Secrets: `SLACK_BOT_TOKEN`, passed as `token`.

```yaml
- name: Notify Slack
  continue-on-error: true
  uses: klaviyo/klaviyo-react-native-sdk/.github/shared/notify-slack@master
  with:
    token: ${{ secrets.SLACK_BOT_TOKEN }}
    status: success
    title: Android SDK `${{ env.VERSION }}` published
```

## promotion-check

Checks whether every commit in a PR (minus commits already on the base by patch-id) was reviewed in its own merged PR. The approver must have write access and can't be the author or a bot. It writes the table to the job summary. On a promotion PR it also creates or updates one comment (`<!-- promotion-check -->`). A source PR that only touches paths without a CODEOWNERS owner passes. A merge commit passes when `git show --remerge-diff` is empty. A commit with no source PR passes as the bot version bump when its author and committer are both `github-actions[bot]` with email `41898333+github-actions[bot]@users.noreply.github.com`, its subject starts with `rel: bump version`, and every file it touches matches `bump-files`. Failures are ❌ when review was bypassed elsewhere and ⚠️ when the gap is in this PR. The check is informational and fails only on errors.

The action runs the `promotion-check.sh` bundled beside it, never the PR head's copy. It checks out the PR head with full history into `path`.

| Input          | Required | Default                                                                                   |
| -------------- | -------- | ----------------------------------------------------------------------------------------- |
| `bump-files`   | no       | `''` (no commit is exempt). Newline-separated globs; `**` crosses `/`, `*` and `?` don't. |
| `github-token` | no       | `github.token`                                                                            |
| `repository`   | no       | `github.repository`                                                                       |
| `pr-number`    | no       | `github.event.pull_request.number`                                                        |
| `base-ref`     | no       | `github.event.pull_request.base.ref`                                                      |
| `head-sha`     | no       | `github.event.pull_request.head.sha`                                                      |
| `dry-run`      | no       | `'false'` (`'true'` writes no comment)                                                    |
| `path`         | no       | `_promotion-check`                                                                        |

Outputs: none. Permissions: `contents: read`, `pull-requests: write`. Secrets: none.

```yaml
name: Promotion Check

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review, edited]

permissions:
  contents: read
  pull-requests: write

jobs:
  promotion-check:
    name: Promotion check
    if: github.event.action != 'edited' || github.event.changes.base != null
    runs-on: ubuntu-latest
    concurrency:
      group: promotion-check-${{ github.event.pull_request.number }}
      cancel-in-progress: true
    steps:
      - uses: klaviyo/klaviyo-react-native-sdk/.github/shared/promotion-check@master
        with:
          bump-files: |
            Sources/KlaviyoCore/Utils/Version.swift
            *.podspec
            Tests/**/__Snapshots__/**
```

Run it locally without writing a comment:

```bash
DRY_RUN=true BUMP_FILES=$'package.json\n*.podspec' \
  .github/shared/promotion-check/promotion-check.sh <owner/repo> <pr-number> origin/<base> <head-sha>
```

## pr-target-check

Fails a PR into `protected-base` unless its head branch starts with an allowed prefix, its lowercased title matches `allowed-title-regex`, or it has `override-label`. While failing it adds `label` and posts one warning comment marked with `comment-marker`. A later pass removes both. API errors fail closed.

| Input                   | Required | Default                                                              |
| ----------------------- | -------- | -------------------------------------------------------------------- |
| `github-token`          | no       | `github.token` (comment cleanup matches `github-actions[bot]`)       |
| `protected-base`        | no       | `master`                                                             |
| `allowed-head-prefixes` | no       | `rel/`, `ci/`, `docs/`, `dependabot/` (newline or comma separated)   |
| `allowed-title-regex`   | no       | `^(ci\|chore\|docs\|rel)(\([^)]*\))?!?:[[:space:]]` (empty disables) |
| `label`                 | no       | `needs: release branch`                                              |
| `override-label`        | no       | `manual-merge`                                                       |
| `comment-marker`        | no       | `<!-- pr-target-check-warning -->`                                   |

Outputs: none. Permissions: `pull-requests: write`, `issues: write`. Secrets: none.

```yaml
name: PR Target Branch Check

on:
  pull_request:
    types: [opened, synchronize, reopened, edited, labeled, unlabeled]

jobs:
  check-pr-target:
    name: Check PR targets a release branch
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
    steps:
      - uses: klaviyo/klaviyo-react-native-sdk/.github/shared/pr-target-check@master
```

## linear-release-sync

Checks out full history, runs `linear/linear-release-action` `sync` and then `complete` (only if sync succeeded). It skips a version containing `-` and a `release` event marked prerelease. Every step is `continue-on-error`.

| Input     | Required | Default                                 |
| --------- | -------- | --------------------------------------- |
| `version` | yes      |                                         |
| `token`   | yes      |                                         |
| `name`    | no       | `version`                               |
| `ref`     | no       | `''` (checkout's default for the event) |

Outputs: `synced`, `completed` (`'true'`/`'false'`). Permissions: `contents: read`. Secrets: `LINEAR_ACCESS_KEY`, passed as `token`.

```yaml
linear-release:
  needs: publish
  if: ${{ !inputs.dry_run }}
  continue-on-error: true
  runs-on: ubuntu-24.04
  permissions:
    contents: read
  steps:
    - uses: klaviyo/klaviyo-react-native-sdk/.github/shared/linear-release-sync@master
      with:
        version: ${{ needs.publish.outputs.version }}
        token: ${{ secrets.LINEAR_ACCESS_KEY }}
        ref: ${{ needs.publish.outputs.version }}
```

## stale

Runs `actions/stale` with the MAGE labels and messages. Only issues and PRs labeled `awaiting-reporter-response` or `missing-details` (either one, `any-of-labels`) are processed. Such an issue is labeled `stale` after 14 days without activity and closed 14 days after that; such a PR is labeled `stale` after 16 days and closed 14 days after that. New activity removes the `stale` label. Items with neither label are left alone. `evergreen` exempts both; `investigating` and `awaiting-team` also exempt issues.

| Input                | Required | Default        |
| -------------------- | -------- | -------------- |
| `github-token`       | no       | `github.token` |
| `operations-per-run` | no       | `'300'`        |

Outputs: none. Permissions: `issues: write`, `pull-requests: write`. Secrets: none.

```yaml
name: Mark stale issues and pull requests

on:
  schedule:
    - cron: '0 17 * * *'

jobs:
  stale:
    runs-on: ubuntu-24.04
    permissions:
      issues: write
      pull-requests: write
    steps:
      - uses: klaviyo/klaviyo-react-native-sdk/.github/shared/stale@master
```

## remove-deploy-label

On a `pull_request` `labeled` event from a same-repo branch, removes the triggering label when it starts with `label-prefix`, so re-applying the label triggers again. On any other event, label or fork it does nothing. A label that is already gone isn't an error.

| Input          | Required | Default              |
| -------------- | -------- | -------------------- |
| `github-token` | no       | `github.token`       |
| `label-prefix` | no       | `deploy-example-app` |

Outputs: `removed` (`'true'` when the triggering label matched). Permissions: `pull-requests: write`. Secrets: none.

```yaml
cleanup-label:
  name: Remove deploy-example-app label
  needs: [deploy-android, deploy-ios]
  if: always() && github.event_name == 'pull_request'
  runs-on: ubuntu-24.04
  timeout-minutes: 5
  permissions:
    pull-requests: write
  steps:
    - uses: klaviyo/klaviyo-react-native-sdk/.github/shared/remove-deploy-label@master
```

## release-preflight

Runs the shared pre-publish checks, then finds or creates the draft release and posts the pending Slack message. In order:

1. Version is `X.Y.Z` or `X.Y.Z-<prerelease>`.
2. Every name in `required-secrets` is set (names only, never values).
3. Resolves the ref: `ref`, else the release tag on a `release` event, else `rel/<version>` then `rel/<X.Y.Z>` when `prefer-rel-branch`, else the default branch.
4. The commit is on `master` or a `rel/*` branch.
5. The tag doesn't exist (skipped on a `release` event). A failed tag lookup fails closed.
6. `sdk-checks` passes (the SDK's own version stamps, pins, changelog and so on).
7. CI is green, unless `skip-ci-check`. Every `required-workflows` entry must have a latest run with conclusion `success` on the merged PR's head (or the commit itself when it has no PR). A required run that ended `skipped` doesn't block, but it shows as a ⚠️ warning in the job summary and the Slack approval message. Any other completed run that ended in a conclusion other than success, skipped or neutral, on the PR head or the commit, also blocks. `ignore-workflows` names runs that don't block. `ci-event` limits which runs count.
8. Finds the draft release or creates one with generated notes. An existing draft is retargeted to the commit and its notes are kept. A published release fails. Prereleases are never marked latest.
9. Writes the job summary and posts the pending Slack message (skipped on dry runs or when `slack-pending` is false).

On failure it names the failed step, updates the pending message to failed (or posts a new one) and replies in its thread with the step.

| Input                   | Required | Default                                                                               |
| ----------------------- | -------- | ------------------------------------------------------------------------------------- |
| `version`               | yes      |                                                                                       |
| `ref`                   | no       | `''`                                                                                  |
| `prefer-rel-branch`     | no       | `false`                                                                               |
| `dry-run`               | no       | `false`                                                                               |
| `skip-ci-check`         | no       | `false`                                                                               |
| `required-workflows`    | yes      |                                                                                       |
| `ci-event`              | no       | `pull_request` (empty counts every event)                                             |
| `ignore-workflows`      | no       | `''`                                                                                  |
| `required-secrets`      | no       | `''`                                                                                  |
| `sdk-checks`            | no       | `''` (bash run at the commit root; env `VERSION`, `SHA`, `PRERELEASE`)                |
| `sdk-name`              | yes      |                                                                                       |
| `slack-username`        | no       | `''`                                                                                  |
| `slack-icon-emoji`      | no       | `''`                                                                                  |
| `slack-pending`         | no       | `true`                                                                                |
| `approval-instructions` | no       | `Review the draft release notes, then approve the `release` environment on this run.` |
| `triggered-by`          | no       | `''` (derived from the actor)                                                         |
| `runs-on`               | no       | `ubuntu-24.04`                                                                        |

Outputs: `sha`, `short_sha`, `ref`, `prerelease`, `release_url`, `slack_ts`, `ci_skipped`.
Permissions: `contents: write`, `actions: read`, `pull-requests: read`.
Secrets (`secrets: inherit`): `SLACK_BOT_TOKEN`, plus every name in `required-secrets`.

```yaml
jobs:
  prepare:
    uses: klaviyo/klaviyo-react-native-sdk/.github/workflows/release-preflight.yml@master
    permissions:
      contents: write
      actions: read
      pull-requests: read
    secrets: inherit
    with:
      version: ${{ inputs.version }}
      ref: ${{ inputs.ref }}
      dry-run: ${{ inputs.dry_run == true }}
      skip-ci-check: ${{ inputs.skip_ci_check == true }}
      required-workflows: Android SDK CI
      sdk-checks: |
        actual=$(sed -n 's:.*<string name="klaviyo_sdk_version_override">\([^<]*\)</string>.*:\1:p' sdk/core/src/main/res/values/strings.xml)
        [ "$actual" = "$VERSION" ] || { echo "::error::strings.xml has $actual, expected $VERSION"; exit 1; }
      sdk-name: Android SDK
      slack-username: Android SDK
      slack-icon-emoji: ':merlin-orb-android:'

  publish:
    needs: prepare
    environment: release
    # uses needs.prepare.outputs.sha, release_url, slack_ts, prerelease
```

## rel-branch-core

Creates `rel/X.Y.Z` from `base` with a `rel: bump version to X.Y.Z` commit by github-actions[bot]. It does nothing when the branch already exists. It then opens or labels the draft release PR into `release-pr-base`, sends each `dispatch-targets` repo a `repository_dispatch` of type `native-rel-branch` with `client_payload` `{<dispatch-input>: "rel/X.Y.Z", triggered_by: <value>}` (only on the default next-minor train, and never for a prerelease), and posts to Slack. Each SDK keeps its own `rel-branch.yml` with its `repository_dispatch: types: [native-rel-branch]` listener, `schedule:`, `workflow_dispatch` inputs and any pin job, which can read this workflow's outputs. That listener reads the payload through `github.event.client_payload`.

| Input               | Required | Default                                          |
| ------------------- | -------- | ------------------------------------------------ |
| `bump`              | no       | `minor`                                          |
| `steps`             | no       | `1`                                              |
| `version`           | no       | `''` (explicit X.Y.Z, overrides bump and steps)  |
| `base`              | no       | `master`                                         |
| `triggered_by`      | no       | `''`                                             |
| `sdk-name`          | yes      |                                                  |
| `slack-username`    | no       | `''`                                             |
| `slack-icon-emoji`  | no       | `''`                                             |
| `bump-command`      | yes      | (bash at the repo root; env `VERSION`)           |
| `node-version-file` | no       | `''` (set to set up Node.js before the bump)     |
| `dispatch-input`    | no       | `''`                                             |
| `dispatch-targets`  | no       | `''` (space-separated repo names under klaviyo/) |
| `dispatch-label`    | no       | `''` (Slack text for the targets)                |
| `release-pr-base`   | no       | `master`                                         |
| `runs-on`           | no       | `ubuntu-latest`                                  |

Outputs: `version`, `branch`, `created`, `pr_url`, `triggered_by`.
Permissions: `contents: write`, `pull-requests: write`, `issues: write`.
Secrets (`secrets: inherit`): `X_REPO_PAT` (only for dispatches), `SLACK_BOT_TOKEN`.

```yaml
on:
  workflow_dispatch:
    inputs:
      bump: { type: choice, options: [patch, minor, major], default: minor }
      steps: { type: number, default: 1 }
      version: { type: string, required: false }
      base: { type: string, required: false, default: master }
      triggered_by: { type: string, required: false }
  schedule:
    - cron: '0 13 * * 1-5'

concurrency:
  group: rel-branch
  cancel-in-progress: false

jobs:
  rel_branch:
    uses: klaviyo/klaviyo-react-native-sdk/.github/workflows/rel-branch-core.yml@master
    permissions:
      contents: write
      pull-requests: write
      issues: write
    secrets: inherit
    with:
      bump: ${{ inputs.bump || 'minor' }}
      steps: ${{ github.event_name != 'workflow_dispatch' && 1 || inputs.steps }}
      version: ${{ inputs.version }}
      base: ${{ inputs.base || 'master' }}
      triggered_by: ${{ inputs.triggered_by }}
      sdk-name: Android SDK
      slack-username: Android SDK
      slack-icon-emoji: ':merlin-orb-android:'
      bump-command: ./bump-version.sh "$VERSION"
      dispatch-input: android
      dispatch-targets: klaviyo-react-native-sdk klaviyo-flutter-sdk
      dispatch-label: '`React Native`, `Flutter`'
```
