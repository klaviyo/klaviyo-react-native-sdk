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

A newer push to the same branch cancels the run in flight, so quick merges
deploy only the latest commit. Release, manual and PR-label runs are never
cancelled. Runs on different refs can overlap; the build number logic below
handles that. If a cancel lands after an upload, the build exists in the store
without release notes.

Each deploy job runs in a GitHub environment (`android-internal-track`,
`testflight`), so the repo's Deployments page lists each deploy with a link —
the Internal App Sharing URL for Android, the app's TestFlight page for iOS.
The environments have no protection rules and no secrets of their own.

After an iOS upload, a separate `what-to-test` job on a Linux runner waits for
Apple to finish processing the build and sets its TestFlight **What to Test**
text, so no macOS runner is held during processing.

`.github/workflows/example-publish-checks.yml` runs on PRs that touch the
workflow or its helpers: actionlint, shellcheck, and unit tests for
`asc.rb` / `play-publish.sh` / `gradle-retry.sh` / `example/scripts`. It also
has a read-only dry run (next TestFlight build number, highest Play
versionCode) gated to `workflow_dispatch` on master, since it runs with the
store credentials in its environment.

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
| `SLACK_WEBHOOK_URL`                   | both    | Incoming webhook for deploy notifications                                                                                             |

---

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
