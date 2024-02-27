# Contributing

Thank you for considering contributing to the Klaviyo SDK!

We welcome your contributions and strive to respond in a timely manner. In return, we ask that you do your
**due diligence** to answer your own questions using public resources, and check for related issues (including
closed ones) before posting. This helps keep the discussion focused on the most important topics. Issues deemed
off-topic or out of scope for the SDK will be closed.

Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md). We want this community to be friendly
and respectful to each other. Please follow it in all your interactions with the project.

## Github Issues

If you suspect a bug or have a feature request, please open an issue, following the guidelines below:

- Research your issue using public resources such as Google, Stack Overflow, React Native documentation, etc.
- Attempt to reproduce your issue with the example app provided in the repository. Setup instruction can be found below.
- Check if the issue has already been reported before.
- Use a clear and descriptive title for the issue to identify the problem.
- Include as much information as possible, including:
  - The version of the SDK you are using.
  - The version of React Native you are using.
  - The platform (iOS or Android) you are experiencing the issue on.
  - Any error messages you are seeing.
  - The expected behavior and what went wrong.
  - Detailed steps to reproduce the issue
  - A code snippet or a minimal example that reproduces the issue.

> ⚠️ Answer all questions in the issue template. Incomplete issues will be de-prioritized or closed. ⚠️

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, run the following in the root directory to install the required dependencies for each package:

```sh
yarn example-setup
```

And configure the pre-commit hooks with:

```sh
yarn husky install
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development.

The [example app](/example) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be
reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a
rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or XCode to edit the native code, you can open the `example/android` or `example/ios`
directories respectively in those editors. To edit the Objective-C or Swift files, open `example/ios/KlaviyoReactNativeSdkExample.xcworkspace`
in XCode and find the source files at `Pods > Development Pods > klaviyo-react-native-sdk`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `klaviyo-react-native-sdk` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
yarn typecheck
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint-fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

### Linting and tests

For pre-commit file formatters/linters, you may need to install the following if you don’t have them already:

```sh
which ktlint
# if not found, install with homebrew:
brew install ktlint

which swiftlint
# if not found install with homebrew
brew install swiftlint
```

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/), SwiftLint and KtLint with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn example-setup`: install dependencies for the example app
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
