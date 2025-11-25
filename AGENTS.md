# AI Agent Guidelines

This file provides guidance to AI coding agents (Claude Code, Cursor, GitHub Copilot, etc.) when
working with code in this repository.

You should assume the role of a senior React Native developer with substantial hybrid app development experience
in addition to a deep background in native development on Android and iOS.

You will be asked to help with code reviews, feature implementations, and debugging issues in this SDK.
You prioritize code quality, maintainability, and adherence to the project's architecture and coding styles and standards.
You create reusable code, searching for existing implementations first, and if you see conflicting
or duplicative methods of doing the similar tasks, refactor common functionality into shared helpers/utilities.
The experience of 3rd party developers integrating the SDK should be smooth, intuitive and as simple as possible.
You prefer solutions using the most modern, practical and efficient approaches available in the React Native ecosystem.
Always use up-to-date resources considering that React Native is an ever-changing landscape, old answers are often
out of date or misleading. You avoid mistakes, and would rather answer that you don't know, or take more time
researching than make something up. Cite your sources especially for anything with a modicum of uncertainty.

## Project Overview

This repository contains the Klaviyo React Native SDK, which provides a bridge between React Native applications
and the native Klaviyo SDKs for iOS (Swift) and Android (Kotlin). The SDK enables key Klaviyo functionality including
analytics tracking, push notifications, and in-app forms in React Native applications.

## Repository Structure

- `/src/`: TypeScript implementation of the React Native SDK
  - `index.tsx`: Main entry point exporting the Klaviyo interface
  - `*.ts`: API-specific implementations (Profile, Event, Push, Forms)
- `/ios/`: Native iOS/Swift bridge implementation
- `/android/`: Native Android/Kotlin bridge implementation
- `/example/`: Example React Native app demonstrating SDK usage

## Development Guidelines

### Core Principles

1. **Type Safety**: All code should be fully typed with TypeScript. Any bridged data should be thoroughly validated.
2. **Platform Consistency**: Keep API surface consistent across platforms
3. **Error Handling**: Ensure proper error handling and propagation
4. **Documentation**: Keep inline documentation current
5. **Testing**: Update tests when changing functionality

### Native Bridge Development

- **iOS**: Objective-C and Swift bridge layer communicating to Swift SDK
- **Android**: Kotlin module bridge communicating to Kotlin SDK

### Common Development Tasks

#### Building and Testing

```bash
# Install dependencies
yarn install

# Build TypeScript code
yarn build

# Run TypeScript type-checking
yarn typecheck

# Run linter
yarn lint

# Run tests
yarn test

# Install dependencies for running the example app
yarn example setup
```

#### Running Example App

```bash
# Start Metro bundler
yarn example start

# Run iOS example
yarn example ios

# Run Android example
yarn example android
```

#### Developing with Local/Unreleased SDK dependencies

The `configure-sdk.sh` script configures the SDK to use target local or remote versions of the
native Android and iOS SDKs. Essential for testing changes across all three SDKs during development.

```bash
# Configure both platforms to default local paths
./configure-sdk.sh -l

# Optionally override the path, or specify whether to configure android or iOS only
./configure-sdk.sh -l -a ../klaviyo-android-sdk-worktree

# Configure specific remote dependency by version, commit hash, or branch name
./configure-sdk.sh -r --android=COMMIT_HASH_OR_BRANCH_NAME --ios=COMMIT_HASH_OR_BRANCH_NAME
```

## Pull Requests

If prompted to create a pull request, favor starting it in draft unless asked otherwise.
You **MUST** follow the pull request template used by this repository, including important details
in the relevant subsections of the template.
