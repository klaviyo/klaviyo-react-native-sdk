'use strict';

const {
  androidRef,
  iosRef,
  parseLockCommit,
  parseLockVersion,
  parsePodfileOverride,
  parsePodspecVersion,
  rnRef,
  rnVersion,
  updateEnvContent,
} = require('../sdk-ref');

const NO_NETWORK = {
  snapshotToRef: (branch) => `${branch}@unresolved`,
  localResolver: (p) => `local:${p}`,
};

describe('rnVersion', () => {
  it('reads the version field', () => {
    expect(rnVersion('{"name":"x","version":"2.5.1"}')).toBe('2.5.1');
  });

  it('returns unknown for invalid JSON', () => {
    expect(rnVersion('not json')).toBe('unknown');
    expect(rnVersion(null)).toBe('unknown');
  });
});

describe('rnRef', () => {
  it('is the bare version when HEAD is tagged with the version', () => {
    expect(
      rnRef('2.5.1', { tagNames: ['2.5.1'], branch: 'main', sha: 'abc1234' })
    ).toBe('2.5.1');
    expect(
      rnRef('2.5.1', { tagNames: ['v2.5.1'], branch: 'main', sha: 'abc1234' })
    ).toBe('2.5.1');
  });

  it('includes branch@sha when HEAD is not tagged', () => {
    expect(
      rnRef('2.5.1', {
        tagNames: [],
        branch: 'rel/2.5.1',
        sha: 'abc1234',
        dirty: false,
      })
    ).toBe('2.5.1 (rel/2.5.1@abc1234)');
  });

  it('appends -dirty for a dirty tree', () => {
    expect(
      rnRef('2.5.1', {
        tagNames: [],
        branch: 'main',
        sha: 'abc1234',
        dirty: true,
      })
    ).toBe('2.5.1 (main@abc1234-dirty)');
  });

  it('falls back when git info is missing', () => {
    expect(
      rnRef('2.5.1', { tagNames: [], branch: null, sha: null, dirty: false })
    ).toBe('2.5.1');
    expect(
      rnRef('2.5.1', {
        tagNames: [],
        branch: null,
        sha: 'abc1234',
        dirty: false,
      })
    ).toBe('2.5.1 (unknown@abc1234)');
    expect(
      rnRef('unknown', { tagNames: [], branch: 'main', sha: 'abc1234' })
    ).toBe('unknown');
  });
});

describe('androidRef', () => {
  it('passes a semver pin through', () => {
    expect(androidRef('4.5.1', NO_NETWORK)).toBe('4.5.1');
  });

  it('truncates a commit pin to sha7', () => {
    expect(
      androidRef('252a62ea36e47109e92bd376b0a1c4026b956e75', NO_NETWORK)
    ).toBe('252a62e');
    expect(androidRef('252a62e', NO_NETWORK)).toBe('252a62e');
  });

  it('maps a -SNAPSHOT pin back to branch@sha7 via ls-remote', () => {
    const resolvers = {
      ...NO_NETWORK,
      snapshotToRef: (branch) => `${branch}@deadbee`,
    };
    expect(androidRef('main-SNAPSHOT', resolvers)).toBe('main@deadbee');
  });

  it('restores slashes from tildes in -SNAPSHOT branch names', () => {
    const seen = [];
    const resolvers = {
      ...NO_NETWORK,
      snapshotToRef: (branch) => {
        seen.push(branch);
        return `${branch}@deadbee`;
      },
    };
    expect(
      androidRef('ecm~MAGE-1073~continuous-deployment-SNAPSHOT', resolvers)
    ).toBe('ecm/MAGE-1073/continuous-deployment@deadbee');
    expect(seen).toEqual(['ecm/MAGE-1073/continuous-deployment']);
  });

  it('reports branch@unresolved when the remote lookup fails', () => {
    expect(androidRef('main-SNAPSHOT', NO_NETWORK)).toBe('main@unresolved');
  });

  it('returns unknown for missing or unrecognized pins', () => {
    expect(androidRef(null, NO_NETWORK)).toBe('unknown');
    expect(androidRef('', NO_NETWORK)).toBe('unknown');
    expect(androidRef('not a pin', NO_NETWORK)).toBe('unknown');
  });
});

describe('parsePodspecVersion', () => {
  it('reads the pinned version', () => {
    expect(
      parsePodspecVersion(
        's.dependency "KlaviyoSwift", "5.4.1"',
        'KlaviyoSwift'
      )
    ).toBe('5.4.1');
  });

  it('ignores the commented-out override form', () => {
    expect(
      parsePodspecVersion(
        's.dependency "KlaviyoSwift" ##, "5.4.1"',
        'KlaviyoSwift'
      )
    ).toBeNull();
  });

  it('returns null when the pod is absent', () => {
    expect(
      parsePodspecVersion('s.dependency "React-Core"', 'KlaviyoSwift')
    ).toBeNull();
    expect(parsePodspecVersion(null, 'KlaviyoSwift')).toBeNull();
  });
});

describe('parsePodfileOverride', () => {
  it('parses a version pin', () => {
    expect(
      parsePodfileOverride("  pod 'KlaviyoSwift', '5.4.1'", 'KlaviyoSwift')
    ).toEqual({ kind: 'version', value: '5.4.1' });
  });

  it('parses a :path override', () => {
    expect(
      parsePodfileOverride(
        "  pod 'KlaviyoSwift', :path => '../../../klaviyo-swift-sdk'",
        'KlaviyoSwift'
      )
    ).toEqual({ kind: 'path', value: '../../../klaviyo-swift-sdk' });
  });

  it('parses a :git :commit override', () => {
    expect(
      parsePodfileOverride(
        "  pod 'KlaviyoSwift', :git => 'https://github.com/klaviyo/klaviyo-swift-sdk.git', :commit => '252a62ea36e47109e92bd376b0a1c4026b956e75'",
        'KlaviyoSwift'
      )
    ).toEqual({
      kind: 'commit',
      value: '252a62ea36e47109e92bd376b0a1c4026b956e75',
    });
  });

  it('parses a :git :branch override', () => {
    expect(
      parsePodfileOverride(
        "  pod 'KlaviyoSwift', :git => 'https://github.com/klaviyo/klaviyo-swift-sdk.git', :branch => 'rel/5.4'",
        'KlaviyoSwift'
      )
    ).toEqual({ kind: 'branch', value: 'rel/5.4' });
  });

  it('does not match other pods or missing lines', () => {
    expect(
      parsePodfileOverride(
        "  pod 'KlaviyoSwiftExtension', '5.4.1'",
        'KlaviyoSwift'
      )
    ).toBeNull();
    expect(parsePodfileOverride(null, 'KlaviyoSwift')).toBeNull();
  });
});

describe('parseLockVersion / parseLockCommit', () => {
  const lock = [
    'PODS:',
    '  - klaviyo-react-native-sdk (2.5.1):',
    '    - KlaviyoSwift (= 5.4.1)',
    '  - KlaviyoSwift (5.4.1):',
    '    - KlaviyoCore (~> 5.4.1)',
    '',
  ].join('\n');

  it('reads the resolved version, not the requirement', () => {
    expect(parseLockVersion(lock, 'KlaviyoSwift')).toBe('5.4.1');
  });

  it('returns null when the pod is absent from the lock', () => {
    expect(parseLockVersion(lock, 'KlaviyoNope')).toBeNull();
    expect(parseLockVersion(null, 'KlaviyoSwift')).toBeNull();
  });

  it('reads the commit for git-sourced pods', () => {
    const gitLock = [
      'PODS:',
      '  - KlaviyoSwift (5.4.1)',
      '',
      'CHECKOUT OPTIONS',
      '  KlaviyoSwift: :checkout => "deadbee"',
      '    :commit => "252a62ea36e47109e92bd376b0a1c4026b956e75"',
      '',
    ].join('\n');
    expect(parseLockCommit(gitLock, 'KlaviyoSwift')).toBe(
      '252a62ea36e47109e92bd376b0a1c4026b956e75'
    );
  });

  it('returns null without a checkout options entry', () => {
    expect(parseLockCommit(lock, 'KlaviyoSwift')).toBeNull();
  });
});

describe('iosRef', () => {
  it('prefers the lockfile version', () => {
    const lock = '  - KlaviyoSwift (5.4.1):\n';
    expect(
      iosRef(
        {
          lockContent: lock,
          podfileContent: "pod 'KlaviyoSwift', '9.9.9'",
          podspecContent: 's.dependency "KlaviyoSwift", "9.9.9"',
        },
        NO_NETWORK
      )
    ).toBe('5.4.1');
  });

  it('annotates the version with the checkout commit for git pods', () => {
    const lock = [
      '  - KlaviyoSwift (5.4.1)',
      '',
      '  KlaviyoSwift: :checkout => "deadbee"',
      '    :commit => "252a62ea36e47109e92bd376b0a1c4026b956e75"',
    ].join('\n');
    expect(
      iosRef(
        { lockContent: lock, podfileContent: null, podspecContent: null },
        NO_NETWORK
      )
    ).toBe('5.4.1 (252a62e)');
  });

  it('falls back to the Podfile override when no lock is present', () => {
    expect(
      iosRef(
        {
          lockContent: null,
          podfileContent:
            "  pod 'KlaviyoSwift', :git => 'https://github.com/klaviyo/klaviyo-swift-sdk.git', :commit => '252a62ea36e47109e92bd376b0a1c4026b956e75'",
          podspecContent: null,
        },
        NO_NETWORK
      )
    ).toBe('252a62e');
  });

  it('falls back to the podspec version', () => {
    expect(
      iosRef(
        {
          lockContent: null,
          podfileContent: "  pod 'KlaviyoSwiftExtension'",
          podspecContent: 's.dependency "KlaviyoSwift", "5.4.1"',
        },
        NO_NETWORK
      )
    ).toBe('5.4.1');
  });

  it('returns unknown when nothing resolves', () => {
    expect(
      iosRef(
        { lockContent: null, podfileContent: null, podspecContent: null },
        NO_NETWORK
      )
    ).toBe('unknown');
  });
});

describe('updateEnvContent', () => {
  const refs = {
    KLAVIYO_SDK_REF_RN: '2.5.1',
    KLAVIYO_SDK_REF_ANDROID: '4.5.1',
    KLAVIYO_SDK_REF_IOS: '5.4.1',
  };

  it('creates the file content when missing', () => {
    expect(updateEnvContent(null, refs)).toBe(
      'KLAVIYO_SDK_REF_RN=2.5.1\nKLAVIYO_SDK_REF_ANDROID=4.5.1\nKLAVIYO_SDK_REF_IOS=5.4.1\n'
    );
  });

  it('replaces managed lines and preserves everything else', () => {
    const existing =
      'KLAVIYO_API_KEY=abc123\nKLAVIYO_SDK_REF_RN=stale\nOTHER=keep\n# comment\n';
    expect(updateEnvContent(existing, refs)).toBe(
      'KLAVIYO_API_KEY=abc123\nOTHER=keep\n# comment\n' +
        'KLAVIYO_SDK_REF_RN=2.5.1\nKLAVIYO_SDK_REF_ANDROID=4.5.1\nKLAVIYO_SDK_REF_IOS=5.4.1\n'
    );
  });

  it('appends to a file without a trailing newline cleanly', () => {
    expect(updateEnvContent('KLAVIYO_API_KEY=abc123', refs)).toBe(
      'KLAVIYO_API_KEY=abc123\n' +
        'KLAVIYO_SDK_REF_RN=2.5.1\nKLAVIYO_SDK_REF_ANDROID=4.5.1\nKLAVIYO_SDK_REF_IOS=5.4.1\n'
    );
  });

  it('writes unknown for missing refs', () => {
    expect(updateEnvContent(null, {})).toBe(
      'KLAVIYO_SDK_REF_RN=unknown\nKLAVIYO_SDK_REF_ANDROID=unknown\nKLAVIYO_SDK_REF_IOS=unknown\n'
    );
  });
});
