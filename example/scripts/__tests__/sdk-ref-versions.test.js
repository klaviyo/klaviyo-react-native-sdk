'use strict';

const fs = require('fs');
const path = require('path');

const sdkRef = require('../sdk-ref');
const {
  androidVersion,
  iosVersion,
  parseSavedCommentVersion,
  updateEnvContent,
} = sdkRef;

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const EXAMPLE_DIR = path.resolve(REPO_ROOT, 'example');

const read = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};

describe('parseSavedCommentVersion', () => {
  it('reads the saved semver above the pin key', () => {
    const content =
      '# saved: 4.5.1\nKlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=252a62e\n';
    expect(
      parseSavedCommentVersion(
        content,
        'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
      )
    ).toBe('4.5.1');
  });

  it('ignores saved comments for other keys and missing comments', () => {
    const content =
      '# saved: 9.9.9\nother.key=abc\nKlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=252a62e\n';
    expect(
      parseSavedCommentVersion(
        content,
        'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
      )
    ).toBeNull();
    expect(
      parseSavedCommentVersion(
        'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=252a62e\n',
        'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
      )
    ).toBeNull();
    expect(
      parseSavedCommentVersion(
        null,
        'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
      )
    ).toBeNull();
  });
});

describe('androidVersion', () => {
  it('is the pin when it is a semver', () => {
    expect(
      androidVersion(
        'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=4.5.1\n',
        'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
      )
    ).toBe('4.5.1');
  });

  it('restores the saved version when the pin is a commit', () => {
    const content =
      '# saved: 4.5.1\nKlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=252a62ea36e47109e92bd376b0a1c4026b956e75\n';
    expect(
      androidVersion(content, 'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion')
    ).toBe('4.5.1');
  });

  it('restores the saved version when the pin is a branch snapshot', () => {
    const content =
      '# saved: 4.5.1\nKlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=main-SNAPSHOT\n';
    expect(
      androidVersion(content, 'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion')
    ).toBe('4.5.1');
  });

  it('falls back to the pin string when no saved comment exists', () => {
    const content =
      'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=main-SNAPSHOT\n';
    expect(
      androidVersion(content, 'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion')
    ).toBe('main-SNAPSHOT');
  });

  it('returns unknown when the key is absent', () => {
    expect(
      androidVersion('', 'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion')
    ).toBe('unknown');
    expect(
      androidVersion(null, 'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion')
    ).toBe('unknown');
  });
});

describe('iosVersion', () => {
  const lock = [
    'PODS:',
    '  - klaviyo-react-native-sdk (2.5.1):',
    '    - KlaviyoSwift (= 5.4.1)',
    '  - KlaviyoSwift (5.4.1):',
    '',
  ].join('\n');

  it('reads the resolved version from the lockfile', () => {
    expect(iosVersion({ lockContent: lock, podspecContent: null })).toBe(
      '5.4.1'
    );
  });

  it('falls back to the podspec pin when the lockfile is absent', () => {
    expect(
      iosVersion({
        lockContent: null,
        podspecContent: 's.dependency "KlaviyoSwift", "5.4.2"',
      })
    ).toBe('5.4.2');
  });

  it('returns unknown when nothing resolves', () => {
    expect(iosVersion({ lockContent: null, podspecContent: null })).toBe(
      'unknown'
    );
  });
});

describe('updateEnvContent with version keys', () => {
  it('writes all eleven managed keys and preserves other lines', () => {
    const existing =
      'KLAVIYO_API_KEY=abc123\nKLAVIYO_SDK_VERSION_RN=stale\nKLAVIYO_BUILD_BRANCH=stale\nOTHER=keep\n';
    const out = updateEnvContent(existing, {
      KLAVIYO_SDK_REF_RN: '2.5.1',
      KLAVIYO_SDK_REF_ANDROID: '4.5.1',
      KLAVIYO_SDK_REF_IOS: '5.4.1',
      KLAVIYO_SDK_VERSION_RN: '2.5.1',
      KLAVIYO_SDK_VERSION_ANDROID: '4.5.1',
      KLAVIYO_SDK_VERSION_IOS: '5.4.1',
      KLAVIYO_BUILD_APP_VERSION: '2.5.1',
      KLAVIYO_BUILD_NUMBER: '7',
      KLAVIYO_BUILD_COMMIT: 'abc1234',
      KLAVIYO_BUILD_BRANCH: 'main',
      KLAVIYO_BUILD_BUILT: '2026-10-13 21:00 UTC',
    });
    expect(out).toBe(
      'KLAVIYO_API_KEY=abc123\nOTHER=keep\n' +
        'KLAVIYO_SDK_REF_RN=2.5.1\n' +
        'KLAVIYO_SDK_REF_ANDROID=4.5.1\n' +
        'KLAVIYO_SDK_REF_IOS=5.4.1\n' +
        'KLAVIYO_SDK_VERSION_RN=2.5.1\n' +
        'KLAVIYO_SDK_VERSION_ANDROID=4.5.1\n' +
        'KLAVIYO_SDK_VERSION_IOS=5.4.1\n' +
        'KLAVIYO_BUILD_APP_VERSION=2.5.1\n' +
        'KLAVIYO_BUILD_NUMBER=7\n' +
        'KLAVIYO_BUILD_COMMIT=abc1234\n' +
        'KLAVIYO_BUILD_BRANCH=main\n' +
        'KLAVIYO_BUILD_BUILT=2026-10-13 21:00 UTC\n'
    );
  });
});

describe('node formatter', () => {
  const base = {
    appName: 'RN Example',
    appVersion: '2.5.1',
    buildNumber: '7',
    platform: 'ios',
    rnVersion: '2.5.1',
    rnRef: '2.5.1',
    nativeVersion: '5.4.1',
    nativeRef: '5.4.1',
    commit: 'abc1234',
    sourceLabel: 'main',
  };

  it('renders the release form without a ref suffix or CI line', () => {
    expect(sdkRef.formatBuildInfoHeader(base)).toBe(
      [
        'RN Example 2.5.1 (7)',
        'Klaviyo RN SDK 2.5.1',
        'Klaviyo iOS SDK 5.4.1',
        'Commit: abc1234 on main',
      ].join('\n')
    );
  });

  it('adds the event suffix and CI line when given', () => {
    expect(
      sdkRef.formatBuildInfoHeader({
        ...base,
        event: 'pull_request',
        runUrl: 'https://example.com/run/1',
      })
    ).toBe(
      [
        'RN Example 2.5.1 (7)',
        'Klaviyo RN SDK 2.5.1',
        'Klaviyo iOS SDK 5.4.1',
        'Commit: abc1234 on main (pull_request)',
        'CI run: https://example.com/run/1',
      ].join('\n')
    );
  });

  it('renders the android row for android builds', () => {
    const out = sdkRef.formatBuildInfoHeader({
      ...base,
      platform: 'android',
      nativeVersion: '4.5.1',
      nativeRef: 'main@deadbee',
    });
    expect(out).toContain('Klaviyo Android SDK 4.5.1 · main@deadbee');
    expect(out).not.toContain('iOS');
  });

  it('renders em dashes for missing values', () => {
    expect(
      sdkRef.formatBuildInfoHeader({ appName: 'RN Example', platform: 'ios' })
    ).toBe(
      [
        'RN Example —',
        'Klaviyo RN SDK —',
        'Klaviyo iOS SDK —',
        'Commit: — on —',
      ].join('\n')
    );
  });

  it('keeps prerelease suffixes and shows refs', () => {
    expect(sdkRef.formatVersionRef('2.6.0-rc.1', 'rel/2.6@abc1234-dirty')).toBe(
      '2.6.0-rc.1 · rel/2.6@abc1234-dirty'
    );
  });
});

describe('parseArgs', () => {
  it('reads --flag value pairs and skips valueless flags', () => {
    expect(
      sdkRef.parseArgs(['--print', '--build', '42', '--commit', 'abc'])
    ).toEqual({ build: '42', commit: 'abc' });
  });
});

describe('resolved versions against this checkout', () => {
  const resolved = sdkRef.resolveAll();

  // Independently derive each version from its source file so the assertion
  // fails if the generator drops or garbles the version plumbing.
  const expectedRn = JSON.parse(
    read(path.join(REPO_ROOT, 'package.json'))
  ).version;
  const gradleContent = read(
    path.join(REPO_ROOT, 'android', 'gradle.properties')
  );
  const expectedAndroid = androidVersion(
    gradleContent,
    'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
  );
  const expectedIos =
    sdkRef.parseLockVersion(
      read(path.join(EXAMPLE_DIR, 'ios', 'Podfile.lock')),
      'KlaviyoSwift'
    ) ||
    sdkRef.parsePodspecVersion(
      read(path.join(REPO_ROOT, 'klaviyo-react-native-sdk.podspec')),
      'KlaviyoSwift'
    );

  it.each([
    ['KLAVIYO_SDK_VERSION_RN', expectedRn],
    ['KLAVIYO_SDK_VERSION_ANDROID', expectedAndroid],
    ['KLAVIYO_SDK_VERSION_IOS', expectedIos],
  ])('%s is resolved and matches its source file', (key, expected) => {
    expect(expected).toBeTruthy();
    expect(expected).not.toBe('unknown');
    expect(resolved[key]).toBe(expected);
  });
});
