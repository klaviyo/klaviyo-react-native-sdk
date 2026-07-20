# React Native SDK Migration Guide

This guide outlines how developers can migrate from older versions of our SDK to newer ones.

## Migrating to v2.5.0

### Automatic push token forwarding is now the default on Android

As of v2.5.0 (which pins the native Android SDK to 4.5.0), the Klaviyo SDK forwards the Android FCM
push token to Klaviyo **automatically by default**. This formalizes behavior the bundled
`KlaviyoPushService` already performed, and is **non-breaking** — the default preserves existing
behavior.

**iOS is unchanged:** automatic forwarding remains opt-in (off by default), because iOS token
collection relies on the more invasive app-delegate method swizzling. The flag's semantics are
identical across platforms (`false` = no automatic collection); only the per-platform default
differs, for these platform-specific reasons.

**No action is required** to keep current behavior. If you prefer to own the push-token pipeline
yourself:

- **Android** — disable automatic forwarding by adding this `meta-data` to the `<application>`
  element of your `AndroidManifest.xml`, then continue calling `Klaviyo.setPushToken(...)` yourself:
  ```xml
  <meta-data
      android:name="com.klaviyo.push.automatic_push_token_forwarding"
      android:value="false" />
  ```
- **iOS** — nothing to do; automatic forwarding is off unless you opt in via `Info.plist` (see the
  native [iOS README](https://github.com/klaviyo/klaviyo-swift-sdk#Push-Notifications)).

If you already collect and set the token manually on Android, no change is needed — duplicate tokens
are deduplicated and cause no extra network request. See the
[README](./README.md#collecting-push-tokens) for full token-collection guidance.

> **Looking ahead:** a future **major** release may enable **both** `automatic_push_open_tracking`
> and `automatic_push_token_forwarding` by default on all platforms, bringing automatic push
> integration to parity. If that happens, apps that prefer to manage push integration manually would
> need to **opt out** of the enabled defaults (as described above for Android), rather than opt in.
> This is a non-breaking, forward-looking heads-up — nothing changes until that release, and we will
> document the exact opt-out steps in its migration guide.

## Migrating to v2.0.0

### In-App Forms

As a result of changes summarized below, you may wish to revisit the logic of when you call `registerForInAppForms()` when upgrading from 1.2.0, particularly if you were registering than once per application session. Consult the [README](./README.md#in-app-forms) for the latest integration instructions.

#### Updated behaviors

- In version 1.2.0, calling `registerForInAppForms()` functioned like a "fetch" that would check if a form was available and if yes, display it. Version 2.0.0 changes this behavior so that `registerForInAppForms()` sets up a persistent listener that will be ready to display a form if and when one is targeted to the current profile.
- A deep link from an In-App Form will now be issued _after_ the form has closed, instead of during the close animation in order to prevent a race condition if the host application expects the form to be closed before handling the deep link.

#### Configurable In-App Form session timeout

Introduced a configurable session timeout for In-App Forms, which defaults to 60 minutes, as an optional argument to `registerForInAppForms()`.

#### New `unregisterFromInAppForms()` method

Because the `registerForInAppForms()` method now functions as a persistent listener rather than a "fetch", we've introduced an [`unregisterFromInAppForms()` method](./README.md#unregister-from-in-app-forms) so you can stop listening for In-App Forms at appropriate times, such as when a user logs out.
