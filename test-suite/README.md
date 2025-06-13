# React Native Test App Suite

Tools to automatically test Klaviyo SDK integration against a number of RN versions on both platforms

## Local Instructions

Run `bootstrap.sh -b`. Get a cup of coffee, maybe a scone. It's going to take a while.
After the script installs dependencies in all the subprojects, you should be set up to test on any of these versions
of React Native.

## Running tests

I'm working on automating some tests for each platform. To test for iOS run `boot.sh -t ios`
and for Android run `boot.sh -t android`. You can still specify just one project with the `-d` flag.
