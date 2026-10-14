# Example App Continuous Deployment

## Overview

`.github/workflows/publish-example.yml` deploys the example app to the Play
Store internal track (Android) and TestFlight (iOS) on every push to `master`
or a `rel/**` branch, whenever a GitHub release is published, and on demand.
The two platforms are independent jobs; one failing does not block the other.

It can also run from a PR by applying a label (removed again after the run,
so reapplying re-triggers):

- `deploy-example-app` — both platforms
- `deploy-example-app:android` — Android only
- `deploy-example-app:ios` — iOS only

Label-triggered deploys report the PR head branch and head commit in the
store notes and Slack messages (not the synthetic merge ref).

Every trigger — push, release, manual and PR-label — gates the deploys on the
same-run `checks` (the ci.yml lint, unit test and library build jobs) and
`publish-checks` (the example-publish-checks.yml workflow and script checks)
jobs. A failure in either means no store upload.

Deploys are skipped, not failed, until the required secrets exist: a
`preflight-<platform>` job checks the platform's secrets before its deploy
runs. On `push` and `release` a missing secret skips the deploy green with a
`::notice::` naming the missing secret names (no Slack message); on
`workflow_dispatch` and label-triggered deploys the preflight fails red,
since a human asked for the deploy.

A newer push to the same branch cancels the run in flight, so quick merges
deploy only the latest commit. Release, manual and PR-label runs are never
cancelled. Runs on different refs can overlap; the build number logic below
handles that. If a cancel lands after an upload, the build exists in the store
without release notes.

Each deploy job runs in a GitHub environment (`android-internal-track`,
`testflight`), so the repo's Deployments page lists each deploy. Only the iOS
environment carries a URL (the app's `beta.itunes.apple.com/v1/app/<id>` page,
which opens for existing testers only). The Android environment has no URL:
this repo is public and so is the Deployments page, so the Internal App
Sharing link is masked in the logs and appears only in the Slack message.

After an iOS upload, a separate `what-to-test` job on a Linux runner waits for
Apple to finish processing the build and sets its TestFlight **What to Test**
text, so no macOS runner is held during processing.

`.github/workflows/example-publish-checks.yml` runs on PRs that touch the
workflow or its helpers: actionlint, shellcheck, and unit tests for
`asc.rb` / `play-publish.sh` / `gradle-retry.sh` / `example/scripts`. The
publish workflow also calls it as the `publish-checks` job before every
deploy. It also has a read-only dry run (next TestFlight build number,
highest Play versionCode) gated to `workflow_dispatch` on master, since it
runs with the store credentials in its environment; the dry run is skipped
when the workflow is called by another workflow.

---

## Required GitHub Secrets

| Secret                                | Used by | Description                                                                                                                           |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `KLAVIYO_EXAMPLE_API_KEY`             | both    | Klaviyo public API key baked into the example app                                                                                     |
| `GOOGLE_SERVICES_JSON`                | Android | `google-services.json` contents                                                                                                       |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64`    | iOS     | Base64-encoded `GoogleService-Info.plist`                                                                                             |
| `SIGNING_KEY`                         | Android | Base64-encoded upload keystore (`.jks`)                                                                                               |
| `KEY_STORE_PASSWORD`                  | Android | Keystore password                                                                                                                     |
| `KEY_PASSWORD`                        | Android | Key password                                                                                                                          |
| `ALIAS`                               | Android | Key alias                                                                                                                             |
| `SERVICE_ACCOUNT_JSON`                | Android | Play service account JSON (Android Publisher API)                                                                                     |
| `APP_STORE_CONNECT_API_KEY_ID`        | iOS     | App Store Connect API key ID                                                                                                          |
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | iOS     | App Store Connect API issuer ID                                                                                                       |
| `APP_STORE_CONNECT_API_KEY_BASE64`    | iOS     | Base64-encoded `.p8` key. Used for the build-number preflight and to set What to Test, so the key needs at least the App Manager role |
| `MATCH_PASSWORD`                      | iOS     | fastlane match passphrase for the mobile-certificates repo                                                                            |
| `MATCH_DEPLOY_KEY`                    | iOS     | SSH deploy key for the mobile-certificates repo                                                                                       |
| `APPLE_TEAM_ID`                       | iOS     | Apple Developer team ID                                                                                                               |
| `BUILD_CERTIFICATE_BASE64`            | iOS     | Base64-encoded password-protected `.p12` with the Apple Distribution certificate **and its private key**                              |
| `P12_PASSWORD`                        | iOS     | Password for that `.p12`                                                                                                              |
| `SLACK_WEBHOOK_URL`                   | both    | Incoming webhook for deploy notifications (optional; when unset the Slack steps skip with a notice)                                   |

Store secrets must be repository secrets, not environment secrets; the
preflight jobs declare no environment, so they cannot see environment secrets
and would skip forever.

---

## One-time setup (humans)

Store listings and config:

1. Play Console app for `com.klaviyoreactnativesdkexample`, with an internal
   testing track and a testers list. Play only accepts API uploads after the
   first bundle has been uploaded by hand.
2. Google Cloud service account with release permission on that app (Play
   Console → Users and permissions); its key JSON goes in
   `SERVICE_ACCOUNT_JSON`.
3. App Store Connect app for bundle id `com.klaviyoreactnativesdkexample`,
   plus explicit App IDs for it and its notification-service extension
   `com.klaviyoreactnativesdkexample.KlaviyoReactNativeSdkExampleExtension`.
4. App Store distribution profiles named
   `match AppStore com.klaviyoreactnativesdkexample` and
   `match AppStore com.klaviyoreactnativesdkexample.KlaviyoReactNativeSdkExampleExtension`
   in `klaviyo/mobile-certificates` (run `fastlane match appstore` from
   `example` once with write access; CI only reads — see
   `example/fastlane/Matchfile`).
5. Firebase config for both platforms: the `google-services.json` contents go
   in `GOOGLE_SERVICES_JSON` and the base64-encoded `GoogleService-Info.plist`
   in `GOOGLE_SERVICE_INFO_PLIST_BASE64`. Both are for
   `com.klaviyoreactnativesdkexample`.

The remaining secrets are listed in the table above; values there match the
names the workflow reads.

### GitHub environments

The deploy jobs run in the GitHub environments `android-internal-track` and
`testflight`, which exist for deploy history (the Deployments page) and the
testflight URL. They hold no secrets — the preflight jobs declare no
environment, so the store secrets must be repository secrets — and should
have no required reviewers.

### Public build logs

This repo is public, so anyone can read its Actions logs. The scripts never
echo secrets or run with `set -x`, and the Slack messages only carry links
that need a Play tester or App Store Connect login to open — no public
TestFlight links. The Android Internal App Sharing link appears only in the
Slack message: the workflow masks it with `::add-mask` right after reading it
and does not set it as the environment URL. Do not add steps that print
environment variables, upload signed artifacts, or post public install links.

## Build Numbers and Retries

### Android

`versionCode` is globally monotonic (Play requires it): the job asks Play for
the highest uploaded code and uses one above it. If another run takes the code
before the upload commits, `play-publish.sh` exits 75 and the loop re-queries
and rebuilds with `max(highest, current) + 1`, up to 3 attempts. A failed
preflight query stops the job before building.

### iOS

Build numbers restart at 1 per marketing version and strictly increase within
it (same convention as `bump-version.sh`):

1. **Preflight**: `asc.rb next-build-number --marketing-version <v>` asks App
   Store Connect for the highest build number of that version and uses one
   above it, or 1 when the version has no builds yet. A failed query stops the
   job before building.
2. **Pre-upload re-check**: after archive+export, the same query runs again
   with `--minimum` set to the current number. If a concurrent run took it in
   the meantime, the app is rebuilt with the fresh number without uploading —
   except on the final attempt, which always uploads. A failed re-check only
   warns; the upload goes ahead.
3. **Retry on conflict**: if `altool` still reports a duplicate
   (`previousBundleVersion = N`, ITMS-90189, or an `ERROR:` line), the loop
   rebuilds with `max(N + 1, current + 1, re-resolved)`, up to 4 attempts.
   (`altool` can exit 0 on failure, so its output is grepped too.)

### Prerelease versions

When the SDK version is a prerelease (`2.6.0-rc.1`), the iOS marketing
version is the stripped numeric form (`2.6.0`): Apple requires
`CFBundleShortVersionString` to be numeric `X.Y[.Z]`. `bump-version.sh`
writes the stripped value to the pbxproj (and validates it), and the publish
workflow re-derives it from `package.json` and pins it with
`agvtool new-marketing-version` before building. Build numbers key on the
stripped value, so a prerelease shares its release version's build sequence.
The full version (suffix included) still appears in the app UI, the store
notes and every Slack message. Android `versionName` keeps the full string;
`versionCode` is unaffected.

## Release Notes / What to Test

The `.github/actions/example-release-notes` composite writes the store notes:
app version and build number/code, SDK refs, commit short SHA and subject, ref
and trigger, build time (UTC), and a link to the CI run. On
`release: published` the release name and body are appended. Free text reaches
the script only through env vars, and truncation cuts the appended release text
first so the header survives the store's cap (500 chars on Play, 4000 on
TestFlight). iOS notes are composed after the final upload so they carry the
build number that actually shipped; Android notes omit the versionCode, which
the Play release name already carries.

## SDK Refs

`example/scripts/sdk-ref.js` resolves which RN/Android/iOS SDK builds the app
compiles against (release version, `branch@sha`, or `local:branch@sha-dirty`)
and writes them to `example/.env` for the app UI. The same one-line summary
appears in the store notes and the Slack message.

## Getting a Build as a Tester

Builds go to internal testers only; there are no public install links.

- **Android**: the Slack message links the Internal App Sharing URL. Opening
  it requires a Google account authorized for the app's internal sharing list
  — ask in `#mobile-push-team` to be added.
- **iOS**: the Slack message links `https://beta.itunes.apple.com/v1/app/<id>`,
  which only opens for existing testers. Install the named version/build in
  the TestFlight app once Apple finishes processing (usually 5–30 minutes).
  New testers: ask in `#mobile-push-team` to be added to the internal
  TestFlight group with your Apple ID email.

## Manual Trigger

```bash
gh workflow run publish-example.yml --ref master -f platform=both   # or android / ios
```

## Common Failures

- **versionCode / build number conflict after all retries**: re-run the
  workflow; overlapping deploys raced past the retry budget.
- **"0 valid identities found" / match import failure**: `BUILD_CERTIFICATE_BASE64`
  is missing the private key or the wrong `P12_PASSWORD`. Re-export the `.p12`
  with the key included.
- **altool exits 0 but nothing uploaded**: the upload output is grepped for
  `ERROR:` for exactly this reason; a miss means the pattern needs widening.
- **What to Test failed but the build is on TestFlight**: the `what-to-test`
  job only sets notes. Check the API key's role, or that Apple took under 45
  minutes to process. Set the notes by hand in App Store Connect if needed.
- **Internal App Sharing upload failed**: the deploy itself succeeded; only the
  Slack install link is missing (the step is `continue-on-error`). The track
  build is still available in the Play Console.

## Pinned Actions

Every `uses:` in the publish workflow, its checks workflow and its composite
actions is pinned to a full commit SHA with the version in a comment.
`.github/dependabot.yml` opens one grouped PR a month to update them.

The tools the deploy installs are pinned in files Dependabot watches, never
inline in a `run:` step: the Ruby gems that sign and upload (`jwt`, `webrick`,
`fastlane`) in `.github/pins/*/Gemfile` and PyYAML in
`.github/pins/python/requirements.txt`. Each has a monthly, grouped entry in
`.github/dependabot.yml`. shellcheck 0.9.0 is pinned on purpose, with its
checksum, so lint results do not shift under a release; it is updated by hand.
