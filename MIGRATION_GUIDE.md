# React Native SDK Migration Guide

This guide outlines how developers can migrate from older versions of our SDK to newer ones.

## Migrating to v2.5.0

### Android's `automatic_push_token_forwarding` flag is now three-valued

On Android, `automatic_push_token_forwarding` has three states, because leaving it unset is
different from setting it to `false`:

| Value | Behavior |
|---|---|
| **not set** (default) | The native SDK forwards a token whenever FCM delivers one to its bundled `KlaviyoPushService`. This is the SDK's original behavior and requires no manifest changes. |
| **`true`** | Additionally fetches and registers the current token at `Klaviyo.initialize()` and on each foreground. |
| **`false`** | No automatic forwarding at all — call `Klaviyo.setPushToken(...)` yourself. |

**No action is required** to keep current behavior — the unset default matches what this SDK has
always done. If you prefer to own the push-token pipeline entirely, set the flag to `false` and
continue calling `Klaviyo.setPushToken(...)` yourself:

```xml
<meta-data
    android:name="com.klaviyo.push.automatic_push_token_forwarding"
    android:value="false" />
```

See the [README](./README.md#collecting-push-tokens) for full token-collection guidance.

> **Looking ahead:** a future **major** release may default `automatic_push_token_forwarding` to
> `true` (in addition to enabling `automatic_push_open_tracking` by default), bringing automatic
> push integration to parity across platforms. This is a non-breaking, forward-looking heads-up —
> nothing changes until that release.

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
