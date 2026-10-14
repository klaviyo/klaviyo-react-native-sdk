import { MISSING, buildSdkInfoEntries, buildCopyText } from '../sdkInfo';
import type { SdkInfoEnv } from '../sdkInfo';

const env: SdkInfoEnv = {
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

describe('sdkInfo', () => {
  it('builds the build-info rows', () => {
    expect(buildSdkInfoEntries(env, 'android')).toEqual([
      { label: 'App', version: '2.6.0-rc.1 (42)' },
      { label: 'Klaviyo RN SDK', version: '2.6.0-rc.1 · rel/2.6@abc1234' },
      { label: 'Klaviyo Android SDK', version: '4.6.0 · main@deadbee' },
      { label: 'App commit', version: 'cafe123 on rel/2.6' },
      { label: 'Built', version: '2026-10-13 21:00 UTC' },
    ]);
  });

  it('shows a dash for missing values', () => {
    expect(
      buildSdkInfoEntries({}, 'ios').every((e) => e.version === MISSING)
    ).toBe(true);
  });

  it('builds the copy text', () => {
    expect(buildCopyText(env, 'ios', 'RN Example')).toBe(
      [
        'RN Example 2.6.0-rc.1 (42)',
        'Klaviyo RN SDK 2.6.0-rc.1 · rel/2.6@abc1234',
        'Klaviyo iOS SDK 5.4.1',
        'Commit: cafe123 on rel/2.6',
        'Built: 2026-10-13 21:00 UTC',
      ].join('\n')
    );
  });
});
