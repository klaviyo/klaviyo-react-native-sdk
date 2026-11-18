# .github Guidelines

For agents and humans editing workflows and actions here. `CLAUDE.md` in this directory points to this file.

## Slack

- Use only `.github/shared/notify-slack` for Slack. It wraps slackapi/slack-github-action, so don't call slackapi or curl directly.
- `token: ${{ secrets.SLACK_BOT_TOKEN }}`. An empty token skips, so no presence checks.
- One message per release or deploy, updated through `ts` (job output or `workflow_call` input). Failure details go in a `thread_ts` reply.
- Each workflow sets `SLACK_USERNAME` and `SLACK_ICON_EMOJI` in its top-level `env:` ("React Native SDK", or "React Native Example App" in `publish-example.yml`; `:merlin-orb-react-native:`).
- `continue-on-error: true` on Slack notify steps and Slack-action checkout steps.
- Report a cancelled job only on timeout: the `Classify cancellation` step in `publish-example.yml` and `publish-sdk.yml`.
- `publish-example.yml` posts one live message per run: `announce` posts it as pending, `progress` edits it once checks pass, and `report` edits it to the final result (including "blocked, <job> failed" when a gate fails). The deploy jobs and What to Test warnings reply in its thread. When `publish-release.yml` passes `slack_thread_ts` (only if the workflow file at the tag declares it), `announce` posts that message as a reply in the release thread and the same edits apply to it.
- `publish-sdk.yml` posts a pending reply in the release thread when the npm publish starts and edits it to published or failed.
- `doc-bot.yml` posts one pending message when a master run starts and `notify` edits it to deployed (with the docs link), failed or stopped. Its push trigger is limited to TypeDoc inputs via `paths:`; add new ones there.
- `publish-release.yml` passes `slack_thread_ts` to `publish-sdk.yml`. Jobs that check out another ref, or no ref, call `klaviyo/klaviyo-react-native-sdk/.github/shared/notify-slack@master`; jobs that already check out this commit call `./.github/shared/notify-slack`.

## Shared SDK CI

- `.github/shared/`, `workflows/release-preflight.yml` and `workflows/rel-branch-core.yml` are used by all 5 SDKs (klaviyo-android-sdk, klaviyo-swift-sdk, klaviyo-react-native-sdk, klaviyo-flutter-sdk, klaviyo-expo-plugin), which call them at `@master`. The contract is `.github/shared/README.md`; update it with every change.
- Inputs are additive only: a new input is optional and its default keeps today's behavior. To rename an input, accept both names.
- A breaking change updates every caller in one batch.
- `rel-branch-core.yml` reaches each wrapper with a `repository_dispatch` of type `native-rel-branch` (Contents: write on `X_REPO_PAT`), so a wrapper's `rel-branch.yml` needs `repository_dispatch: types: [native-rel-branch]` and reads its pin branch from `github.event.client_payload.<dispatch-input>`. Don't switch that back to `gh workflow run`, which needs Actions: write.
- klaviyo-android-test-app and klaviyo-ios-test-app also call `notify-slack@master`.
- This repo calls them by local path (`./.github/shared/<name>`, `./.github/workflows/<file>.yml`) when the job has this commit checked out.

## Workflow conventions

- This repo is public, so Actions logs are too. Never post public install links (see `PUBLISH_EXAMPLE.md`).
- `publish-example.yml` skips docs, CI and config-only changes via `paths-ignore`. Add new CI-only paths there.
- `publish-release.yml` is the npm trusted publisher entry point; `publish-sdk.yml` is only called from it.
