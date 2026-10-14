# Example App Continuous Deployment

`.github/workflows/publish-example.yml` deploys the example app to the Play
Store internal track (Android) and TestFlight (iOS) on every push to `master`
or a `rel/**` branch, whenever a GitHub release is published, and on demand.
The two platforms are independent jobs; one failing does not block the other.

A PR label also triggers it (removed again after the run, so reapplying
re-triggers): `deploy-example-app` (both), `deploy-example-app:android`,
`deploy-example-app:ios`. Fork PRs never deploy. Label deploys report the PR
head branch and commit, not the synthetic merge ref.

Every trigger gates the deploys on the same-run `checks` job (the `ci.yml`
lint, unit tests and library build). A failure there means no store upload.

Deploys are skipped, not failed, until the required secrets exist: a
`preflight-<platform>` job checks them first. On `push` and `release` a missing
secret skips the deploy green with a `::notice::` naming it; on manual and
label deploys the preflight fails red, since a human asked for the deploy.

A newer push to the same branch cancels the run in flight; release, manual and
label runs are never cancelled. After an iOS upload, a `what-to-test` job on a
Linux runner waits for Apple to process the build and sets its TestFlight
**What to Test** text, so no macOS runner is held during processing.

## Required GitHub secrets

Store secrets must be repository secrets, not environment secrets: the
preflight jobs declare no environment and cannot see environment secrets.

| Secret                                | Used by | Description                                                                           |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `KLAVIYO_EXAMPLE_API_KEY`             | both    | Klaviyo public API key baked into the example app                                     |
| `GOOGLE_SERVICES_JSON`                | Android | `google-services.json` contents                                                       |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64`    | iOS     | Base64-encoded `GoogleService-Info.plist`                                             |
| `SIGNING_KEY`                         | Android | Base64-encoded upload keystore (`.jks`)                                               |
| `KEY_STORE_PASSWORD`                  | Android | Keystore password                                                                     |
| `KEY_PASSWORD`                        | Android | Key password                                                                          |
| `ALIAS`                               | Android | Key alias                                                                             |
| `SERVICE_ACCOUNT_JSON`                | Android | Play service account JSON (Android Publisher API)                                     |
| `APP_STORE_CONNECT_API_KEY_ID`        | iOS     | App Store Connect API key ID                                                          |
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | iOS     | App Store Connect API issuer ID                                                       |
| `APP_STORE_CONNECT_API_KEY_BASE64`    | iOS     | Base64-encoded `.p8` key, at least the App Manager role (build numbers, What to Test) |
| `MATCH_PASSWORD`                      | iOS     | fastlane match passphrase for the mobile-certificates repo                            |
| `MATCH_DEPLOY_KEY`                    | iOS     | SSH deploy key for the mobile-certificates repo                                       |
| `APPLE_TEAM_ID`                       | iOS     | Apple Developer team ID                                                               |
| `BUILD_CERTIFICATE_BASE64`            | iOS     | Base64-encoded `.p12` with the Apple Distribution certificate **and its private key** |
| `P12_PASSWORD`                        | iOS     | Password for that `.p12`                                                              |
| `SLACK_WEBHOOK_URL`                   | both    | Incoming webhook for deploy notifications (optional; Slack steps skip when unset)     |

## One-time setup (humans)

1. Play Console app for `com.klaviyoreactnativesdkexample` with an internal
   testing track and a testers list. Play only accepts API uploads after the
   first bundle has been uploaded by hand.
2. Google Cloud service account with release permission on that app; its key
   JSON goes in `SERVICE_ACCOUNT_JSON`.
3. App Store Connect app for that bundle id, plus explicit App IDs for it and
   its extension `com.klaviyoreactnativesdkexample.KlaviyoReactNativeSdkExampleExtension`.
4. App Store distribution profiles `match AppStore <bundle id>` for both ids in
   `klaviyo/mobile-certificates` (run `fastlane match appstore` from `example`
   once with write access; CI only reads, see `example/fastlane/Matchfile`).
5. Firebase config for both platforms in `GOOGLE_SERVICES_JSON` and
   `GOOGLE_SERVICE_INFO_PLIST_BASE64`.
6. GitHub environments `android-internal-track` and `testflight` (deploy
   history only; no secrets, no required reviewers).

## Public build logs

This repo is public, so its Actions logs are too. The scripts never echo
secrets or use `set -x`, and Slack messages only carry links that need a Play
tester or App Store Connect login. The Android Internal App Sharing link is
masked with `::add-mask` and appears only in Slack. Don't add steps that print
environment variables, upload signed artifacts, or post public install links.

## Build numbers

Both platforms are deployed by lanes in `example/fastlane/Fastfile`
(`fastlane android release`, `fastlane ios release`).

- **Android**: `versionCode` is globally monotonic. The lane reads the highest
  code on the internal track (`google_play_track_version_codes`) and uses one
  above it. If the upload is rejected for a conflict (a code held on another
  track, or a concurrent run), it rebuilds with `max(highest, current) + 1`, up
  to 3 attempts. The Gradle build retries dependency-resolution failures
  (JitPack builds branch and commit SDK targets on first request).
- **iOS**: build numbers restart at 1 per marketing version.
  `latest_testflight_build_number` for that version, plus one, is the first
  number; it is checked again after the archive. A duplicate at upload
  (`previousBundleVersion = N`, ITMS-90189 and similar) rebuilds with a fresh
  number, up to 4 attempts.
- **Prereleases**: for `2.6.0-rc.1` the iOS marketing version is the numeric
  `2.6.0` (Apple requires `X.Y[.Z]`), so a prerelease shares its release's build
  sequence. Android `versionName` keeps the full string, and the full version
  shows in the app, notes and Slack.

## Build info and release notes

`example/scripts/sdk-ref.js` writes the RN, Android and iOS SDK versions and
refs, build number, commit, branch and build time to `example/.env`. The app
shows them in its info modal, and `.github/scripts/release-notes.sh` prints the
same header for the store notes (500 chars on Play, 4000 on TestFlight; the
release name and body are appended on `release: published` and cut first).
`.github/scripts/slack-message.sh` builds the Slack message. Uploads go
through fastlane: `pilot` and `supply` for TestFlight and Play, plus Internal
App Sharing on Android and What to Test on iOS.

## Getting a build as a tester

Builds go to internal testers only. The Slack message links the build: the
Internal App Sharing URL on Android (needs a Google account on the sharing
list) and the TestFlight app page on iOS (install once Apple finishes
processing, usually 5-30 minutes). Ask in `#mobile-push-team` to be added.

## Manual trigger

```bash
gh workflow run publish-example.yml --ref master -f platform=both   # or android / ios
```

## Common failures

- **Build number conflict after all retries**: re-run; overlapping deploys
  raced past the retry budget.
- **"0 valid identities found"**: `BUILD_CERTIFICATE_BASE64` lacks the private
  key, or `P12_PASSWORD` is wrong.
- **What to Test failed but the build is on TestFlight**: check the API key's
  role, or set the notes by hand in App Store Connect.
- **Internal App Sharing upload failed**: the deploy succeeded; only the Slack
  install link is missing. The build is still in the Play Console.

## Pinned actions and tools

Every `uses:` in the publish workflow and its composite actions is pinned to a
full commit SHA, and the fastlane gem the deploy installs is pinned in
`.github/pins/fastlane/Gemfile`. `.github/dependabot.yml` opens one grouped PR
a month for each.
