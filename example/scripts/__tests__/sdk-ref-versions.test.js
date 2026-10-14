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
    built: '2026-10-13 21:00 UTC',
  };

  it('renders the release form without a ref suffix or CI line', () => {
    expect(sdkRef.formatBuildInfoHeader(base)).toBe(
      [
        'RN Example 2.5.1 (7)',
        'Klaviyo RN SDK 2.5.1',
        'Klaviyo iOS SDK 5.4.1',
        'Commit: abc1234 on main',
        'Built: 2026-10-13 21:00 UTC',
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
        'Built: 2026-10-13 21:00 UTC',
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
        'Built: —',
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
  it('reads --flag value pairs and records boolean flags', () => {
    expect(
      sdkRef.parseArgs(['--print', '--build', '42', '--commit', 'abc'])
    ).toEqual({ print: true, build: '42', commit: 'abc' });
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

describe('--print output', () => {
  const { execFileSync } = require('child_process');
  const SCRIPT = path.join(__dirname, '..', 'sdk-ref.js');

  it('is exactly the original three ref lines', () => {
    const out = execFileSync(process.execPath, [SCRIPT, '--print'], {
      encoding: 'utf8',
    });
    const lines = out.replace(/\n$/, '').split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^RN SDK: {6}/);
    expect(lines[1]).toMatch(/^Android SDK: /);
    expect(lines[2]).toMatch(/^iOS SDK: {5}/);
  });
});

describe('--print-header --from-env', () => {
  const { execFileSync } = require('child_process');
  const os = require('os');
  const SCRIPT = path.join(__dirname, '..', 'sdk-ref.js');

  const envContent = [
    'KLAVIYO_SDK_REF_RN=rel/2.6@abc1234',
    'KLAVIYO_SDK_REF_ANDROID=main@deadbee',
    'KLAVIYO_SDK_REF_IOS=5.4.1',
    'KLAVIYO_SDK_VERSION_RN=2.6.0-rc.1',
    'KLAVIYO_SDK_VERSION_ANDROID=4.6.0',
    'KLAVIYO_SDK_VERSION_IOS=5.4.1',
    'KLAVIYO_BUILD_APP_VERSION=2.6.0-rc.1',
    'KLAVIYO_BUILD_NUMBER=42',
    'KLAVIYO_BUILD_COMMIT=cafe123',
    'KLAVIYO_BUILD_BRANCH=rel/2.6',
    'KLAVIYO_BUILD_BUILT=2026-10-13 21:00 UTC',
    '',
  ].join('\n');

  const withTempEnv = (content, fn) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-ref-env-'));
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, content);
    try {
      return fn(file, dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  it('builds the header solely from the .env values', () =>
    withTempEnv(envContent, (file) => {
      const out = execFileSync(
        process.execPath,
        [
          SCRIPT,
          '--print-header',
          '--from-env',
          '1',
          '--env-file',
          file,
          '--platform',
          'ios',
          '--source-label',
          'PR #429',
          '--event',
          'pull_request',
          '--run-url',
          'https://example.com/run/1',
        ],
        { encoding: 'utf8' }
      );
      expect(out).toBe(
        [
          'RN Example 2.6.0-rc.1 (42)',
          'Klaviyo RN SDK 2.6.0-rc.1 · rel/2.6@abc1234',
          'Klaviyo iOS SDK 5.4.1',
          'Commit: cafe123 on PR #429 (pull_request)',
          'Built: 2026-10-13 21:00 UTC',
          'CI run: https://example.com/run/1',
          '',
        ].join('\n')
      );
    }));

  it('matches the in-app copy block for the same values', () =>
    withTempEnv(envContent, (file) => {
      const out = execFileSync(
        process.execPath,
        [
          SCRIPT,
          '--print-header',
          '--from-env',
          '1',
          '--env-file',
          file,
          '--platform',
          'android',
        ],
        { encoding: 'utf8' }
      );
      // Same values through the pure env-driven path equal the TS formatter
      // fixtures asserted in example/src/__tests__/sdkInfo.test.ts.
      expect(out).toBe(
        sdkRef.headerFromEnv(sdkRef.parseEnvContent(envContent), {
          'platform': 'android',
          'app-name': 'RN Example',
        }) + '\n'
      );
    }));

  it('renders em dashes for keys missing from the .env', () =>
    withTempEnv('KLAVIYO_BUILD_BRANCH=main\n', (file) => {
      const out = execFileSync(
        process.execPath,
        [
          SCRIPT,
          '--print-header',
          '--from-env',
          '1',
          '--env-file',
          file,
          '--platform',
          'ios',
        ],
        { encoding: 'utf8' }
      );
      expect(out).toBe(
        [
          'RN Example —',
          'Klaviyo RN SDK —',
          'Klaviyo iOS SDK —',
          'Commit: — on main',
          'Built: —',
          '',
        ].join('\n')
      );
    }));

  it('does not touch git, package.json or the clock', () =>
    withTempEnv(envContent, (file, dir) => {
      // Run from an empty cwd with a PATH that has no git: success proves
      // the mode is pure env-driven.
      const out = execFileSync(
        process.execPath,
        [
          SCRIPT,
          '--print-header',
          '--from-env',
          '1',
          '--env-file',
          file,
          '--platform',
          'ios',
        ],
        {
          encoding: 'utf8',
          cwd: dir,
          env: { PATH: '/nonexistent-no-git-here' },
        }
      );
      expect(out).toContain('RN Example 2.6.0-rc.1 (42)');
    }));
});

describe('parseArgs boolean flags', () => {
  it('treats --from-env as a boolean in any position', () => {
    expect(
      sdkRef.parseArgs(['--print-header', '--from-env', '--env-file', '/tmp/x'])
    ).toEqual({ 'print-header': true, 'from-env': true, 'env-file': '/tmp/x' });
    expect(
      sdkRef.parseArgs(['--env-file', '/tmp/x', '--print-header', '--from-env'])
    ).toEqual({ 'print-header': true, 'from-env': true, 'env-file': '/tmp/x' });
  });

  it('keeps --from-env yes and --from-env=yes working', () => {
    expect(sdkRef.parseArgs(['--from-env', 'yes'])).toEqual({
      'from-env': 'yes',
    });
    expect(sdkRef.parseArgs(['--from-env=yes'])).toEqual({
      'from-env': 'yes',
    });
  });

  it('does not let --from-env swallow a positional-looking value', () => {
    // A following value is consumed as the flag value only when present;
    // a following flag is never consumed.
    expect(sdkRef.parseArgs(['--from-env', '--platform', 'ios'])).toEqual({
      'from-env': true,
      'platform': 'ios',
    });
  });
});

describe('CI requires an explicit commit and branch', () => {
  const { spawnSync } = require('child_process');
  const SCRIPT = path.join(__dirname, '..', 'sdk-ref.js');
  const { ciRequirementErrors, isCi } = require('../sdk-ref');

  // A scratch HOME and cwd outside any checkout: nothing the generator could
  // fall back to (git, GITHUB_*) is available, so a missing check shows up.
  const run = (args, env) => {
    const os = require('os');
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-ref-ci-'));
    return spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: cwd, ...env },
    });
  };

  it('isCi treats true/1 as CI and false/0/empty/unset as local', () => {
    expect(isCi({ CI: 'true' })).toBe(true);
    expect(isCi({ CI: '1' })).toBe(true);
    expect(isCi({ CI: 'false' })).toBe(false);
    expect(isCi({ CI: '0' })).toBe(false);
    expect(isCi({ CI: '' })).toBe(false);
    expect(isCi({})).toBe(false);
  });

  it('names the flag for a missing or empty commit and branch under CI', () => {
    const missing = ciRequirementErrors({}, { CI: 'true' });
    expect(missing).toHaveLength(2);
    expect(missing[0]).toContain('--commit');
    expect(missing[1]).toContain('--branch');
    const empty = ciRequirementErrors(
      { commit: 'abc1234', branch: '  ' },
      { CI: 'true' }
    );
    expect(empty).toHaveLength(1);
    expect(empty[0]).toContain('--branch');
    expect(
      ciRequirementErrors({ commit: 'abc1234', branch: 'main' }, { CI: 'true' })
    ).toEqual([]);
  });

  it('is silent for local runs, which keep the git fallback', () => {
    expect(ciRequirementErrors({}, {})).toEqual([]);
    expect(ciRequirementErrors({}, { CI: 'false' })).toEqual([]);
  });

  it('CLI: CI=true with an empty --branch exits non-zero naming --branch and writes nothing', () => {
    const r = run(['--build', '7', '--commit', 'abc1234', '--branch', ''], {
      CI: 'true',
      GITHUB_REF_NAME: '429/merge',
      GITHUB_SHA: 'abcd5678abcd5678',
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('--branch');
    expect(r.stderr).not.toContain('--commit is required');
    expect(r.stdout).not.toContain('Wrote SDK refs');
  });

  it('CLI: CI=true with --commit missing exits non-zero naming --commit', () => {
    const r = run(['--build', '7', '--branch', 'rel/2.6.0'], {
      CI: 'true',
      GITHUB_SHA: 'abcd5678abcd5678',
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('--commit');
    expect(r.stdout).not.toContain('Wrote SDK refs');
  });

  it('CLI: CI=true with no flags at all names both flags', () => {
    const r = run([], { CI: 'true' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('--commit');
    expect(r.stderr).toContain('--branch');
  });

  it('CLI: CI=true never falls back to GITHUB_REF_NAME/GITHUB_SHA', () => {
    const r = run(['--build', '7', '--commit', 'abc1234', '--branch', ''], {
      CI: 'true',
      GITHUB_REF_NAME: '429/merge',
      GITHUB_HEAD_REF: 'some-head',
    });
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).not.toContain('429/merge');
  });

  it('CLI: read-only --print and --print-versions still work under CI without flags', () => {
    const printed = run(['--print'], { CI: 'true' });
    expect(printed.status).toBe(0);
    const versions = run(['--print-versions'], { CI: 'true' });
    expect(versions.status).toBe(0);
  });

  it('CLI: --print-header --from-env needs no commit or branch under CI', () => {
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-ref-ci-env-'));
    const envFile = path.join(dir, '.env');
    fs.writeFileSync(envFile, 'KLAVIYO_BUILD_APP_VERSION=2.5.1\n');
    const r = run(['--print-header', '--from-env', '--env-file', envFile], {
      CI: 'true',
    });
    expect(r.status).toBe(0);
  });

  it('CLI: a valid CI stamp succeeds and records exactly what was passed', () => {
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-ref-ci-ok-'));
    const r = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--build',
        '7',
        '--commit',
        'cafe1234cafe1234',
        '--branch',
        'ecm/head',
        '--built',
        'x',
      ],
      {
        cwd: dir,
        encoding: 'utf8',
        env: { PATH: process.env.PATH, HOME: dir, CI: 'true' },
      }
    );
    expect(r.status).toBe(0);
    const stamped = fs.readFileSync(
      path.join(__dirname, '..', '..', '.env'),
      'utf8'
    );
    expect(stamped).toContain('KLAVIYO_BUILD_COMMIT=cafe123');
    expect(stamped).toContain('KLAVIYO_BUILD_BRANCH=ecm/head');
  });
});
