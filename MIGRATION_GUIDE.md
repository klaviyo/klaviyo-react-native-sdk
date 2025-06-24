# React Native SDK Migration Guide

This guide outlines how developers can migrate from older versions of our SDK to newer ones.

## Migrating to v2.0.0

### Updated `registerForInAppForms()` behavior:

In version 1.2.0, calling `registerForInAppForms()` functioned like a "fetch" that would check if a form was available and, if yes, display it. Version 2.0.0 changes this behavior so that `registerForInAppForms()` sets up a persistent listener that will be ready to display a form if and when one is targeted to the current profile.

To account for this change, you may choose to revisit the logic of when you call `registerForInAppForms()`. If previously you were calling this multiple times throughout the app in places where you wanted to check for forms, you should now consider calling it once (perhaps within your `useEffect(() => {  Klaviyo.registerForInAppForms(); })` method).

### New `unregisterFromInAppForms()` method

Because the `registerForInAppForms()` method now functions as a listener rather than a "fetch", we've now [added an `unregisterFromInAppForms()`](https://github.com/klaviyo/klaviyo-react-native-sdk?tab=readme-ov-file#unregister-from-in-app-forms) method so you can stop listening for forms if necessary at appropriate points in your app.

### Optional app session configuration

This version adds the concept of an "app session" to the SDK. If you wish to customize the app session timeout, you may do so when calling `registerForInAppForms()`. Please [see the README](https://github.com/klaviyo/klaviyo-react-native-sdk?tab=readme-ov-file#app-session-configuration) for details.
