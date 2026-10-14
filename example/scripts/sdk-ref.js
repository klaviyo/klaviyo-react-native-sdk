#!/usr/bin/env node
/*
 * sdk-ref.js — resolve the versions/refs of the RN SDK and the native
 * Android and iOS SDKs the example app builds against, and persist them to
 * example/.env as a managed block of KLAVIYO_SDK_REF_* lines (read by the
 * app through react-native-dotenv).
 *
 * Usage:
 *   node example/scripts/sdk-ref.js          write the managed block to example/.env
 *   node example/scripts/sdk-ref.js --print  print a human-readable summary instead
 *
 * Ref formats:
 *   official release  5.4.1
 *   branch            branch@abc1234
 *   commit            abc1234
 *   local checkout    local:branch@abc1234[-dirty]
 *
 * Metro inlines .env at bundle time; after this script changes .env, restart
 * Metro with --reset-cache for the app to pick up the new values.
 *
 * Pure functions are exported for unit tests when required as a module.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const UNKNOWN = 'unknown';
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXAMPLE_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(EXAMPLE_DIR, '.env');
const MANAGED_PREFIX = 'KLAVIYO_SDK_REF_';
const MANAGED_KEYS = [
  'KLAVIYO_SDK_REF_RN',
  'KLAVIYO_SDK_REF_ANDROID',
  'KLAVIYO_SDK_REF_IOS',
];
const ANDROID_SDK_REPO = 'https://github.com/klaviyo/klaviyo-android-sdk';

// Runs `git` returning trimmed stdout, or null when git fails / is missing
// (e.g. a tarball checkout or a shallow clone without the ref asked for).
function git(args, cwd) {
  try {
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim();
  } catch {
    return null;
  }
}

// Local repo ref: `branch@sha7` plus `-dirty` for uncommitted changes.
// Accepts `branchOverride` for detached checkouts (CI) where
// `rev-parse --abbrev-ref HEAD` would return "HEAD".
function localRef(repoPath, branchOverride) {
  const sha = git(['rev-parse', '--short=7', 'HEAD'], repoPath);
  if (!sha) {
    return UNKNOWN;
  }
  const branch =
    branchOverride || git(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath);
  const dirty = git(['status', '--porcelain'], repoPath) ? '-dirty' : '';
  return `${branch || UNKNOWN}@${sha}${dirty}`;
}

// Resolves a branch name to `branch@sha7` on the remote, or
// `branch@unresolved` when the network call fails.
function remoteBranchRef(remoteUrl, branch) {
  const out = git(
    [
      '-c',
      'http.lowSpeedLimit=1000',
      '-c',
      'http.lowSpeedTime=10',
      'ls-remote',
      '--heads',
      remoteUrl,
      branch,
    ],
    REPO_ROOT
  );
  const match = out && out.match(/^([0-9a-f]{40})\t/);
  return `${branch}@${match ? match[1].slice(0, 7) : 'unresolved'}`;
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+/.test(value);
}

function isCommit(value) {
  return /^[0-9a-f]{7,40}$/i.test(value);
}

function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function readProperty(content, key) {
  if (!content) {
    return null;
  }
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

// --- RN SDK ---

function rnVersion(packageJsonContent) {
  try {
    return JSON.parse(packageJsonContent).version || UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

// `version` alone when HEAD is exactly a tag matching it (v-prefixed or
// bare), otherwise `version (branch@sha7[-dirty])`. Branch falls back to
// GITHUB_HEAD_REF (PR runs) / GITHUB_REF_NAME since CI checkouts are
// detached.
function rnRef(version, { tagNames, branch, sha, dirty }) {
  if (!version || version === UNKNOWN) {
    return UNKNOWN;
  }
  if (tagNames && tagNames.some((t) => t === version || t === `v${version}`)) {
    return version;
  }
  if (!sha) {
    return version;
  }
  return `${version} (${branch || UNKNOWN}@${sha}${dirty ? '-dirty' : ''})`;
}

// --- Android SDK ---

// Parses one pin shape into a ref. `snapshotToRef` maps a branch name to
// `branch@sha7` (ls-remote) or `branch@unresolved`; `localResolver` maps a
// local path to `local:branch@sha7[-dirty]`.
function androidRef(pin, { snapshotToRef, localResolver }) {
  if (!pin || pin.trim() === '') {
    return UNKNOWN;
  }
  pin = pin.trim();
  if (pin.endsWith('-SNAPSHOT')) {
    const branch = pin.slice(0, -'-SNAPSHOT'.length).replace(/~/g, '/');
    return snapshotToRef(branch);
  }
  if (isSemver(pin)) {
    return pin;
  }
  if (isCommit(pin)) {
    return pin.slice(0, 7);
  }
  return UNKNOWN;
}

// --- iOS SDK ---

// Parses the Podfile.lock PODS section line `  - KlaviyoSwift (5.4.1):` —
// not the requirement line `- KlaviyoSwift (= 5.4.1)` under the parent spec.
function parseLockVersion(lockContent, podName) {
  const match =
    lockContent &&
    lockContent.match(new RegExp(`^  - ${podName} \\((.+)\\)`, 'm'));
  return match ? match[1] : null;
}

function parseLockCommit(lockContent, podName) {
  const pattern = new RegExp(
    `^ {2}${podName}: :checkout => "[^"]*"\\n {4}:commit => "([0-9a-f]+)"`,
    'm'
  );
  const match = lockContent && lockContent.match(pattern);
  return match ? match[1] : null;
}

function parsePodspecVersion(podspecContent, podName) {
  // Ignores commented-out overrides: `s.dependency "KlaviyoSwift" ##, "5.4.1"`.
  const pattern = new RegExp(
    `^\\s*s\\.dependency "${podName}",\\s*"([^"]+)"`,
    'm'
  );
  const match = podspecContent && podspecContent.match(pattern);
  return match ? match[1] : null;
}

function parsePodfileOverride(podfileContent, podName) {
  if (!podfileContent) {
    return null;
  }
  const line = podfileContent.match(
    new RegExp(`^\\s*pod '${podName}'(?!\\w).*$`, 'm')
  );
  if (!line) {
    return null;
  }
  const text = line[0];
  const pathMatch = text.match(/:path\s*=>\s*'([^']+)'/);
  if (pathMatch) {
    return { kind: 'path', value: pathMatch[1] };
  }
  const commitMatch = text.match(/:commit\s*=>\s*'([^']+)'/);
  if (commitMatch) {
    return { kind: 'commit', value: commitMatch[1] };
  }
  const branchMatch = text.match(/:branch\s*=>\s*'([^']+)'/);
  if (branchMatch) {
    return { kind: 'branch', value: branchMatch[1] };
  }
  const versionMatch = text.match(/pod\s+'[^']+',\s*'([^']+)'/);
  if (versionMatch) {
    return { kind: 'version', value: versionMatch[1] };
  }
  return null;
}

// Resolves the iOS ref, preferring the lockfile when present, then a
// Podfile override line, then the podspec version. Same output formats as
// the Android side.
function iosRef({ lockContent, podfileContent, podspecContent }, resolvers) {
  const version = parseLockVersion(lockContent, 'KlaviyoSwift');
  if (version) {
    const commit = parseLockCommit(lockContent, 'KlaviyoSwift');
    return commit ? `${version} (${commit.slice(0, 7)})` : version;
  }
  const override = parsePodfileOverride(podfileContent, 'KlaviyoSwift');
  if (override) {
    switch (override.kind) {
      case 'path':
        return resolvers.localResolver(
          path.resolve(EXAMPLE_DIR, 'ios', override.value)
        );
      case 'commit':
        return override.value.slice(0, 7);
      case 'branch':
        return resolvers.snapshotToRef(override.value);
      case 'version':
        return override.value;
      default:
        return UNKNOWN;
    }
  }
  return parsePodspecVersion(podspecContent, 'KlaviyoSwift') || UNKNOWN;
}

// --- .env managed block ---

// Replaces existing KLAVIYO_SDK_REF_* lines and leaves every other line
// untouched, creating the file when missing.
function updateEnvContent(content, refs) {
  const managed = MANAGED_KEYS.map((key) => `${key}=${refs[key] || UNKNOWN}`);
  if (content === null) {
    return managed.join('\n') + '\n';
  }
  const kept = content
    .split('\n')
    .filter((line) => !line.startsWith(MANAGED_PREFIX));
  while (kept.length > 0 && kept[kept.length - 1] === '') {
    kept.pop();
  }
  return [...kept, ...managed].join('\n') + '\n';
}

// --- resolution against this checkout ---

function resolveAll() {
  const pkgContent = readFileOrNull(path.join(REPO_ROOT, 'package.json'));
  const version = rnVersion(pkgContent);

  // Detached CI checkouts report "HEAD"; prefer the Actions env refs and
  // drop a literal "HEAD" from --abbrev-ref.
  const tagOutput = git(['tag', '--points-at', 'HEAD'], REPO_ROOT);
  const tagNames = tagOutput ? tagOutput.split('\n') : [];
  const abbrevRef = git(['rev-parse', '--abbrev-ref', 'HEAD'], REPO_ROOT);
  const branch =
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF_NAME ||
    (abbrevRef && abbrevRef !== 'HEAD' ? abbrevRef : null);
  const rn = rnRef(version, {
    tagNames,
    branch,
    sha: git(['rev-parse', '--short=7', 'HEAD'], REPO_ROOT),
    dirty: Boolean(git(['status', '--porcelain'], REPO_ROOT)),
  });

  const resolvers = {
    snapshotToRef: (b) => remoteBranchRef(ANDROID_SDK_REPO, b),
    localResolver: (p) => `local:${localRef(p)}`,
  };

  const gradleProperties = readFileOrNull(
    path.join(REPO_ROOT, 'android', 'gradle.properties')
  );
  const androidLocal = readFileOrNull(
    path.join(EXAMPLE_DIR, 'android', 'local.properties')
  );
  const android =
    androidLocal &&
    readProperty(androidLocal, 'localCompositeBuild') === 'true' &&
    readProperty(androidLocal, 'localSdkPath')
      ? resolvers.localResolver(
          path.resolve(
            EXAMPLE_DIR,
            'android',
            readProperty(androidLocal, 'localSdkPath')
          )
        )
      : androidRef(
          readProperty(
            gradleProperties,
            'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
          ),
          resolvers
        );

  const ios = iosRef(
    {
      lockContent: readFileOrNull(
        path.join(EXAMPLE_DIR, 'ios', 'Podfile.lock')
      ),
      podfileContent: readFileOrNull(path.join(EXAMPLE_DIR, 'ios', 'Podfile')),
      podspecContent: readFileOrNull(
        path.join(REPO_ROOT, 'klaviyo-react-native-sdk.podspec')
      ),
    },
    resolvers
  );

  return {
    KLAVIYO_SDK_REF_RN: rn,
    KLAVIYO_SDK_REF_ANDROID: android,
    KLAVIYO_SDK_REF_IOS: ios,
  };
}

function main() {
  const refs = resolveAll();
  if (process.argv.includes('--print')) {
    process.stdout.write(
      `RN SDK:      ${refs.KLAVIYO_SDK_REF_RN}\n` +
        `Android SDK: ${refs.KLAVIYO_SDK_REF_ANDROID}\n` +
        `iOS SDK:     ${refs.KLAVIYO_SDK_REF_IOS}\n`
    );
    return;
  }
  const content = updateEnvContent(readFileOrNull(ENV_FILE), refs);
  fs.writeFileSync(ENV_FILE, content);
  process.stdout.write(`Wrote SDK refs to ${ENV_FILE}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  UNKNOWN,
  androidRef,
  iosRef,
  isCommit,
  isSemver,
  localRef,
  parseLockCommit,
  parseLockVersion,
  parsePodfileOverride,
  parsePodspecVersion,
  remoteBranchRef,
  rnRef,
  rnVersion,
  updateEnvContent,
};
