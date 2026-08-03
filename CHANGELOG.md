# Changelog

All notable changes to the Klaviyo React Native SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For releases prior to 2.5.0, see the
[GitHub Releases](https://github.com/klaviyo/klaviyo-react-native-sdk/releases) page.

## [2.5.0] - Unreleased

### Added

- `Klaviyo.registerDeepLinkHandler(handler)` — register a consumer-side handler that
  receives the resolved destination URL of any deep link the SDK opens (push deep links,
  In-App Form CTAs, and resolved universal tracking links). Returns an unsubscribe
  function. When a handler is registered, the native SDK delivers the resolved URL to it
  instead of opening the URL itself. This lets apps take full control of navigation and,
  on iOS, avoids Apple's universal-link anti-loop protection that otherwise sends users
  to Safari when the SDK opens a universal link on the app's own associated domain
  ([PUSH-831](https://linear.app/klaviyo/issue/PUSH-831)). Available on both iOS and
  Android. ([#270](https://github.com/klaviyo/klaviyo-react-native-sdk/pull/270) had
  previously removed an earlier version of this API; this re-introduces it with a
  cleaner subscription model.)

### Notes

- This is a backward-compatible change. Existing `handleUniversalTrackingLink`
  integrations continue to work unchanged: when no deep link handler is registered, the
  SDK falls back to its default link-opening behavior.
