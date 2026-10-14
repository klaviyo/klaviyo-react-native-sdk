import {
  MISSING,
  buildSdkInfoEntries,
  buildCopyText,
  formatBuildInfoHeader,
  formatVersionRef,
  refPart,
  valueOrMissing,
} from '../sdkInfo';
import type { SdkInfoEnv } from '../sdkInfo';

describe('refPart', () => {
  it('strips an embedded leading version', () => {
    expect(refPart('2.5.1 (rel/2.5@abc1234)', '2.5.1')).toBe('rel/2.5@abc1234');
  });

  it('leaves other refs alone', () => {
    expect(refPart('main@abc1234', '2.5.1')).toBe('main@abc1234');
    expect(refPart('local:main@abc1234-dirty', '2.5.1')).toBe(
      'local:main@abc1234-dirty'
    );
  });
});

describe('formatVersionRef', () => {
  it('is the bare version when ref equals the version', () => {
    expect(formatVersionRef('2.5.1', '2.5.1')).toBe('2.5.1');
  });

  it('omits the ref when it is empty or unknown', () => {
    expect(formatVersionRef('2.5.1', '')).toBe('2.5.1');
    expect(formatVersionRef('2.5.1', undefined)).toBe('2.5.1');
    expect(formatVersionRef('2.5.1', 'unknown')).toBe('2.5.1');
  });

  it('shows the ref part of a ref that embeds the version', () => {
    expect(formatVersionRef('2.5.1', '2.5.1 (rel/2.5@abc1234)')).toBe(
      '2.5.1 · rel/2.5@abc1234'
    );
  });

  it('shows branch, local and dirty refs in full', () => {
    expect(formatVersionRef('4.5.1', 'main@deadbee')).toBe(
      '4.5.1 · main@deadbee'
    );
    expect(formatVersionRef('4.5.1', 'local:main@deadbee-dirty')).toBe(
      '4.5.1 · local:main@deadbee-dirty'
    );
  });

  it('keeps prerelease suffixes in the version', () => {
    expect(formatVersionRef('2.6.0-rc.1', 'main@deadbee')).toBe(
      '2.6.0-rc.1 · main@deadbee'
    );
  });

  it('renders an em dash when the version is missing', () => {
    expect(formatVersionRef(undefined, undefined)).toBe(MISSING);
    expect(formatVersionRef('unknown', undefined)).toBe(MISSING);
  });
});

const fullEnv: SdkInfoEnv = {
  KLAVIYO_SDK_REF_RN: 'rel/2.6@abc1234',
  KLAVIYO_SDK_REF_ANDROID: 'main@deadbee',
  KLAVIYO_SDK_REF_IOS: '5.4.1',
  KLAVIYO_SDK_VERSION_RN: '2.6.0-rc.1',
  KLAVIYO_SDK_VERSION_ANDROID: '4.6.0',
  KLAVIYO_SDK_VERSION_IOS: '5.4.1',
  KLAVIYO_BUILD_APP_VERSION: '2.6.0-rc.1',
  KLAVIYO_BUILD_NUMBER: '42',
  KLAVIYO_BUILD_COMMIT: 'cafe123',
  KLAVIYO_BUILD_BRANCH: 'rel/2.6',
  KLAVIYO_BUILD_BUILT: '2026-10-13 21:00 UTC',
};

describe('buildSdkInfoEntries', () => {
  it('builds the five rows for ios', () => {
    const entries = buildSdkInfoEntries(fullEnv, 'ios');
    expect(entries).toEqual([
      { label: 'App', version: '2.6.0-rc.1 (42)' },
      { label: 'Klaviyo RN SDK', version: '2.6.0-rc.1 · rel/2.6@abc1234' },
      { label: 'Klaviyo iOS SDK', version: '5.4.1' },
      { label: 'App commit', version: 'cafe123 on rel/2.6' },
      { label: 'Built', version: '2026-10-13 21:00 UTC' },
    ]);
  });

  it('shows only the android row on android', () => {
    const entries = buildSdkInfoEntries(fullEnv, 'android');
    expect(entries.map((e) => e.label)).toEqual([
      'App',
      'Klaviyo RN SDK',
      'Klaviyo Android SDK',
      'App commit',
      'Built',
    ]);
    expect(entries[2]?.version).toBe('4.6.0 · main@deadbee');
  });

  it('renders em dashes when data is missing', () => {
    const entries = buildSdkInfoEntries({}, 'ios');
    expect(entries).toEqual([
      { label: 'App', version: MISSING },
      { label: 'Klaviyo RN SDK', version: MISSING },
      { label: 'Klaviyo iOS SDK', version: MISSING },
      { label: 'App commit', version: MISSING },
      { label: 'Built', version: MISSING },
    ]);
  });

  it('omits the build number parentheses when the build is missing', () => {
    const env = { ...fullEnv, KLAVIYO_BUILD_NUMBER: '' };
    expect(buildSdkInfoEntries(env, 'ios')[0]?.version).toBe('2.6.0-rc.1');
  });
});

describe('formatBuildInfoHeader', () => {
  const base = {
    appName: 'RN Example',
    appVersion: '2.5.1',
    buildNumber: '7',
    platform: 'ios' as const,
    rnVersion: '2.5.1',
    rnRef: '2.5.1',
    nativeVersion: '5.4.1',
    nativeRef: '5.4.1',
    commit: 'abc1234',
    sourceLabel: 'main',
  };

  it('renders the release form without a ref suffix or CI line', () => {
    expect(formatBuildInfoHeader(base)).toBe(
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
      formatBuildInfoHeader({
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
    const out = formatBuildInfoHeader({
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
      formatBuildInfoHeader({
        appName: 'RN Example',
        platform: 'ios',
      })
    ).toBe(
      [
        'RN Example —',
        'Klaviyo RN SDK —',
        'Klaviyo iOS SDK —',
        'Commit: — on —',
      ].join('\n')
    );
  });
});

describe('buildCopyText', () => {
  it('matches the in-app copy form (no CI line, branch as source)', () => {
    expect(buildCopyText(fullEnv, 'ios', 'RN Example')).toBe(
      [
        'RN Example 2.6.0-rc.1 (42)',
        'Klaviyo RN SDK 2.6.0-rc.1 · rel/2.6@abc1234',
        'Klaviyo iOS SDK 5.4.1',
        'Commit: cafe123 on rel/2.6',
      ].join('\n')
    );
  });
});

describe('valueOrMissing', () => {
  it('passes values through and maps missing to the em dash', () => {
    expect(valueOrMissing('x')).toBe('x');
    expect(valueOrMissing('')).toBe(MISSING);
    expect(valueOrMissing(undefined)).toBe(MISSING);
    expect(valueOrMissing('unknown')).toBe(MISSING);
  });
});

describe('cross-check with the node formatter', () => {
  // The CI release notes are built by example/scripts/sdk-ref.js while the
  // in-app copy comes from this module; the blocks must stay identical.
  const { execFileSync } = require('child_process');
  const nodeHeader = (fixture: unknown): string =>
    execFileSync(
      process.execPath,
      [
        '-e',
        'const f=require(process.argv[1]);process.stdout.write(f.formatBuildInfoHeader(JSON.parse(process.argv[2])));',
        require.resolve('../../scripts/sdk-ref.js'),
        JSON.stringify(fixture),
      ],
      { encoding: 'utf8' }
    );

  const fixtures = [
    {
      appName: 'RN Example',
      appVersion: '2.5.1',
      buildNumber: '7',
      platform: 'ios' as const,
      rnVersion: '2.5.1',
      rnRef: '2.5.1',
      nativeVersion: '5.4.1',
      nativeRef: '5.4.1',
      commit: 'abc1234',
      sourceLabel: 'main',
      event: 'push',
      runUrl: 'https://example.com/run/1',
    },
    {
      appName: 'RN Example',
      appVersion: '2.5.1',
      buildNumber: '8',
      platform: 'android' as const,
      rnVersion: '2.5.1',
      rnRef: 'rel/2.5@abc1234',
      nativeVersion: '4.5.1',
      nativeRef: 'main@deadbee',
      commit: 'abc1234',
      sourceLabel: 'rel/2.5',
    },
    {
      appName: 'RN Example',
      appVersion: '2.6.0-rc.1',
      buildNumber: '9',
      platform: 'ios' as const,
      rnVersion: '2.6.0-rc.1',
      rnRef: 'local:main@abc1234-dirty',
      nativeVersion: '5.4.1',
      nativeRef: 'local:main@deadbee-dirty',
      commit: 'cafe123',
      sourceLabel: 'main',
    },
  ];

  it.each(fixtures.map((f, i) => [i, f] as const))(
    'fixture %i matches character-for-character',
    (_i, fixture) => {
      expect(nodeHeader(fixture)).toBe(formatBuildInfoHeader(fixture));
    }
  );
});
