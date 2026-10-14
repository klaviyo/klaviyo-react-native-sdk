import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { buildCopyText, buildSdkInfoEntries, MISSING } from '../sdkInfo';
import type { SdkInfoEnv } from '../sdkInfo';

// Runs the real stamp (example/scripts/sdk-ref.js) the way a label deploy does
// and feeds the .env it writes through the same functions the app uses, so the
// values a tester sees in the app are asserted, not just the store notes. The
// stamp runs in a scratch tree outside any git checkout, with the merge-ref
// values a label-deploy runner has in GITHUB_*, so a stamp that fell back to
// them (or to git) would show "429/merge" / the merge sha here.

const SCRIPT_DIR = path.resolve(__dirname, '..', '..', 'scripts');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const PR_HEAD_SHA = 'cafe1234cafe1234cafe1234cafe1234cafe1234';
const MERGE_SHA = 'abcd5678abcd5678abcd5678abcd5678abcd5678';
const PR_HEAD_BRANCH = 'ecm/MAGE-1075/continuous-deployment';

// Parses KEY=VALUE lines the way react-native-dotenv exposes them.
const parseEnv = (text: string): SdkInfoEnv => {
  const env: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && match[1] !== undefined) {
      env[match[1]] = match[2] ?? '';
    }
  }
  return env as SdkInfoEnv;
};

const stamp = (args: string[], extraEnv: Record<string, string> = {}) => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-to-app-'));
  fs.mkdirSync(path.join(scratch, 'example'), { recursive: true });
  fs.cpSync(SCRIPT_DIR, path.join(scratch, 'example', 'scripts'), {
    recursive: true,
  });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'package.json'),
    path.join(scratch, 'package.json')
  );
  fs.mkdirSync(path.join(scratch, 'android'));
  fs.copyFileSync(
    path.join(REPO_ROOT, 'android', 'gradle.properties'),
    path.join(scratch, 'android', 'gradle.properties')
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, 'klaviyo-react-native-sdk.podspec'),
    path.join(scratch, 'klaviyo-react-native-sdk.podspec')
  );

  const result = spawnSync(
    process.execPath,
    [path.join(scratch, 'example', 'scripts', 'sdk-ref.js'), ...args],
    {
      cwd: scratch,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH ?? '',
        HOME: scratch,
        CI: 'true',
        GITHUB_REF_NAME: '429/merge',
        GITHUB_SHA: MERGE_SHA,
        ...extraEnv,
      },
    }
  );
  const envFile = path.join(scratch, 'example', '.env');
  return {
    status: result.status,
    stderr: result.stderr,
    env: fs.existsSync(envFile)
      ? parseEnv(fs.readFileSync(envFile, 'utf8'))
      : undefined,
  };
};

describe('what the app shows for a stamped label deploy', () => {
  const labelDeployArgs = [
    '--build',
    '7',
    '--commit',
    PR_HEAD_SHA,
    '--branch',
    PR_HEAD_BRANCH,
    '--built',
    '2026-10-14 02:00 UTC',
  ];

  it('stamps the PR head commit and branch into the values the app reads', () => {
    const { status, stderr, env } = stamp(labelDeployArgs);
    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(env?.KLAVIYO_BUILD_COMMIT).toBe('cafe123');
    expect(env?.KLAVIYO_BUILD_BRANCH).toBe(PR_HEAD_BRANCH);
    expect(env?.KLAVIYO_BUILD_NUMBER).toBe('7');
  });

  it('the copy block the app produces has the exact commit line, never the merge ref', () => {
    const { env } = stamp(labelDeployArgs);
    const lines = buildCopyText(env as SdkInfoEnv, 'ios', 'RN Example').split(
      '\n'
    );
    // Whole-line equality: a substring match let a wrong source (the RN ref,
    // which starts with the branch name) pass.
    expect(lines).toContain(
      'Commit: cafe123 on ecm/MAGE-1075/continuous-deployment'
    );
    expect(lines).toContain('Built: 2026-10-14 02:00 UTC');
    expect(lines[0]).toMatch(/^RN Example \S+ \(7\)$/);
    // The SDK lines a tester pastes: the RN SDK and only this platform's
    // native SDK, each with a real version.
    const sdkLines = lines.filter((l) => l.startsWith('Klaviyo '));
    expect(sdkLines).toHaveLength(2);
    expect(sdkLines[0]).toMatch(/^Klaviyo RN SDK \d+\.\d+\.\d+\S* /);
    expect(sdkLines[1]).toMatch(/^Klaviyo iOS SDK \d+\.\d+\.\d+/);
    expect(sdkLines.join('\n')).not.toContain('—');
    const copy = lines.join('\n');
    expect(copy).not.toContain('429/merge');
    expect(copy).not.toContain('abcd567');
  });

  it('each platform shows the exact RN and native version the files declare', () => {
    const { env } = stamp(labelDeployArgs);
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
    ) as { version: string };
    const gradle = fs.readFileSync(
      path.join(REPO_ROOT, 'android', 'gradle.properties'),
      'utf8'
    );
    const podspec = fs.readFileSync(
      path.join(REPO_ROOT, 'klaviyo-react-native-sdk.podspec'),
      'utf8'
    );
    const androidVersion = gradle.match(
      /^KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion=(.+)$/m
    )?.[1];
    const iosVersion = podspec.match(
      /s\.dependency "KlaviyoSwift", "([^"]+)"/
    )?.[1];
    expect(androidVersion).toBeTruthy();
    expect(iosVersion).toBeTruthy();

    const rowsFor = (platform: 'ios' | 'android') =>
      Object.fromEntries(
        buildSdkInfoEntries(env as SdkInfoEnv, platform).map((e) => [
          e.label,
          e.version,
        ])
      );

    const ios = rowsFor('ios');
    expect(ios['Klaviyo RN SDK']).toMatch(
      new RegExp(`^${rootPkg.version.replace(/\./g, '\\.')}( · .+)?$`)
    );
    expect(ios['Klaviyo iOS SDK']).toMatch(
      new RegExp(`^${(iosVersion as string).replace(/\./g, '\\.')}( · .+)?$`)
    );
    expect(ios).not.toHaveProperty('Klaviyo Android SDK');

    const android = rowsFor('android');
    expect(android['Klaviyo Android SDK']).toMatch(
      new RegExp(
        `^${(androidVersion as string).replace(/\./g, '\\.')}( · .+)?$`
      )
    );
    expect(android).not.toHaveProperty('Klaviyo iOS SDK');
    for (const rows of [ios, android]) {
      for (const text of Object.values(rows)) {
        expect(text).not.toContain(MISSING);
        expect(text).not.toContain('unknown');
      }
    }
  });

  it('the in-app values come from the stamp, not from GITHUB_* or git', () => {
    // GITHUB_REF_NAME/GITHUB_SHA are the merge ref and merge commit here. The
    // stamp must use only the flags, so changing GITHUB_* changes nothing.
    const a = stamp(labelDeployArgs, { GITHUB_SHA: MERGE_SHA });
    const b = stamp(labelDeployArgs, {
      GITHUB_SHA: 'ffff0000ffff0000',
      GITHUB_REF_NAME: 'something-else',
      GITHUB_HEAD_REF: 'another-head',
    });
    expect(b.env?.KLAVIYO_BUILD_COMMIT).toBe(a.env?.KLAVIYO_BUILD_COMMIT);
    expect(b.env?.KLAVIYO_BUILD_BRANCH).toBe(a.env?.KLAVIYO_BUILD_BRANCH);
  });

  it('a stamp that is refused under CI leaves the app with nothing to show, not a fallback', () => {
    const { status, env } = stamp([
      '--build',
      '7',
      '--commit',
      PR_HEAD_SHA,
      '--branch',
      '',
    ]);
    expect(status).not.toBe(0);
    expect(env).toBeUndefined();
  });
});
