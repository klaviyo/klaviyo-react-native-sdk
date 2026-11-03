# .github Guidelines

For agents and humans editing workflows and actions here. `CLAUDE.md` in this directory points to this file.

## Slack

- Use only `.github/actions/notify-slack` for Slack. It wraps slackapi/slack-github-action, so don't call slackapi or curl directly.
- `token: ${{ secrets.SLACK_BOT_TOKEN }}`. An empty token skips, so no presence checks.
- One message per release or deploy, updated through `ts` (job output or `workflow_call` input). Failure details go in a `thread_ts` reply.
- Each workflow sets `SLACK_USERNAME` and `SLACK_ICON_EMOJI` in its top-level `env:` ("React Native SDK", or "React Native Example App" in `publish-example.yml`; `:merlin-orb-react-native:`).
- `continue-on-error: true` on Slack notify steps and Slack-action checkout steps.
- Report a cancelled job only on timeout: the `Classify cancellation` step in `publish-example.yml`.
- `publish-release.yml` passes `slack_thread_ts` to `publish-sdk.yml`. Jobs that check out another ref sparse-checkout `.github/actions` into `_slack/`.
- `notify-slack` stays byte-identical in all 7 repos: klaviyo-android-sdk, klaviyo-android-test-app, klaviyo-swift-sdk, klaviyo-ios-test-app, klaviyo-react-native-sdk, klaviyo-expo-plugin, klaviyo-flutter-sdk.

## Workflow conventions

- This repo is public, so Actions logs are too. Never post public install links (see `PUBLISH_EXAMPLE.md`).
- `publish-example.yml` skips docs, CI and config-only changes via `paths-ignore`. Add new CI-only paths there.
- `publish-release.yml` is the npm trusted publisher entry point; `publish-sdk.yml` is only called from it.
