# React Native SDK Migration Guide

This guide outlines how developers can migrate from older versions of our SDK to newer ones.

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
