#!/usr/bin/env node
/*
 * sdk-ref.js — resolve the versions/refs of the RN SDK and the native
 * Android and iOS SDKs the example app builds against, plus build metadata,
 * and persist them to example/.env as a managed block of KLAVIYO_SDK_REF_*,
 * KLAVIYO_SDK_VERSION_* and KLAVIYO_BUILD_* lines (read by the app through
 * react-native-dotenv).
 *
 * Usage:
 *   node example/scripts/sdk-ref.js          write the managed block to example/.env
 *   node example/scripts/sdk-ref.js --print  print the three `<Label> SDK: <ref>` lines
 *   node example/scripts/sdk-ref.js --print-versions
 *                                            print the three resolved SDK versions
 *   node example/scripts/sdk-ref.js --print-header [flags]
 *                                            print the release-notes header block
 *   node example/scripts/sdk-ref.js --print-header --from-env [--env-file <path>]
 *                                            print the header block from the
 *                                            managed values already written to
 *                                            example/.env (no git/clock access)
 *
 * Flags (override the git/clock defaults):
 *   --build <n>         build number (KLAVIYO_BUILD_NUMBER)
 *   --commit <sha>      commit sha, truncated to 7 chars (KLAVIYO_BUILD_COMMIT)
 *   --branch <name>     branch name (KLAVIYO_BUILD_BRANCH)
 *                       Both are required, and must be non-empty, when CI is set
 *                       (exit 1 naming the flag); locally they default to git.
 *   --built <string>    build timestamp (KLAVIYO_BUILD_BUILT)
 *   --platform <ios|android>  native SDK row for --print-header
 *   --app-name <name>   app name for --print-header (default "RN Example")
 *   --source-label <s>  source label for the Commit line of --print-header
 *   --event <name>      event suffix for the Commit line of --print-header
 *   --run-url <url>     adds a `CI run:` line to --print-header output
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
const MANAGED_PREFIXES = [
  'KLAVIYO_SDK_REF_',
  'KLAVIYO_SDK_VERSION_',
  'KLAVIYO_BUILD_',
];
const MANAGED_KEYS = [
  'KLAVIYO_SDK_REF_RN',
  'KLAVIYO_SDK_REF_ANDROID',
  'KLAVIYO_SDK_REF_IOS',
  'KLAVIYO_SDK_VERSION_RN',
  'KLAVIYO_SDK_VERSION_ANDROID',
  'KLAVIYO_SDK_VERSION_IOS',
  'KLAVIYO_BUILD_APP_VERSION',
  'KLAVIYO_BUILD_NUMBER',
  'KLAVIYO_BUILD_COMMIT',
  'KLAVIYO_BUILD_BRANCH',
  'KLAVIYO_BUILD_BUILT',
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
// bare), otherwise `branch@sha7[-dirty]`. Branch falls back to
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
  return `${branch || UNKNOWN}@${sha}${dirty ? '-dirty' : ''}`;
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

// Resolves the Android SDK semver: the pin itself when it is a semver, else
// the `# saved: <version>` comment configure-sdk.sh leaves directly above the
// key when it replaces the pin with a commit/branch, else the pin string.
function parseSavedCommentVersion(content, key) {
  if (!content) {
    return null;
  }
  const pattern = new RegExp(
    `^# saved: (\\S+)\\n${key.replace(/\./g, '\\.')}=`,
    'm'
  );
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function androidVersion(gradlePropertiesContent, key) {
  const pin = readProperty(gradlePropertiesContent, key);
  if (!pin) {
    return UNKNOWN;
  }
  if (isSemver(pin)) {
    return pin;
  }
  return parseSavedCommentVersion(gradlePropertiesContent, key) || pin;
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

// Dirty only when no explicit --commit was given and the tree has
// uncommitted changes.
function isDirty({ commit, porcelain }) {
  return commit ? false : Boolean(porcelain);
}

// CocoaPods records git-sourced pods in a YAML section:
//   CHECKOUT OPTIONS:
//     KlaviyoSwift:
//       :commit: <sha>
//       :git: <url>
function parseLockCommit(lockContent, podName) {
  if (!lockContent) {
    return null;
  }
  const lines = lockContent.split('\n');
  let i = lines.findIndex((line) => /^CHECKOUT OPTIONS:?\s*$/.test(line));
  if (i === -1) {
    return null;
  }
  for (i += 1; i < lines.length; i++) {
    if (lines[i] !== '' && !lines[i].startsWith(' ')) {
      break;
    }
    if (lines[i].trim() !== `${podName}:`) {
      continue;
    }
    for (let j = i + 1; j < lines.length && lines[j].startsWith('    '); j++) {
      const match = lines[j].match(/^ {4}:commit: ["']?([0-9a-f]+)["']?\s*$/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }
  return null;
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

// Resolved KlaviyoSwift version: the lockfile's resolved pod version when
// present, otherwise the podspec dependency pin.
function iosVersion({ lockContent, podspecContent }) {
  return (
    parseLockVersion(lockContent, 'KlaviyoSwift') ||
    parsePodspecVersion(podspecContent, 'KlaviyoSwift') ||
    UNKNOWN
  );
}

// --- notes header block (pure; mirrors example/src/sdkInfo.ts) ---

const isMissing = (value) => !value || value === UNKNOWN;

const valueOrMissing = (value) => (isMissing(value) ? '—' : value);

// Strips a leading `<version> (` and trailing `)` so a ref that embeds the
// version reduces to its ref part.
const refPart = (ref, version) =>
  ref.startsWith(`${version} (`) ? ref.slice(version.length + 2, -1) : ref;

// "version · ref", omitting the ref when it is empty or equals the version.
function formatVersionRef(version, ref) {
  const versionText = valueOrMissing(version);
  if (isMissing(ref)) {
    return versionText;
  }
  const short = refPart(ref, versionText);
  return !short || short === versionText
    ? versionText
    : `${versionText} · ${short}`;
}

// Header block shared by the in-app copy and the CI store notes: App line,
// RN SDK row, the native SDK row for the build's platform, a Commit line, a
// Built line, and a CI run line only when runUrl is given.
function formatBuildInfoHeader(input) {
  const appLine = `${input.appName} ${valueOrMissing(input.appVersion)}${
    isMissing(input.buildNumber) ? '' : ` (${input.buildNumber})`
  }`;
  const commitLine = `Commit: ${valueOrMissing(
    input.commit
  )} on ${valueOrMissing(input.sourceLabel)}${
    input.event ? ` (${input.event})` : ''
  }`;
  const lines = [
    appLine,
    `Klaviyo RN SDK ${formatVersionRef(input.rnVersion, input.rnRef)}`,
    `Klaviyo ${
      input.platform === 'ios' ? 'iOS' : 'Android'
    } SDK ${formatVersionRef(input.nativeVersion, input.nativeRef)}`,
    commitLine,
    `Built: ${valueOrMissing(input.built)}`,
  ];
  if (input.runUrl) {
    lines.push(`CI run: ${input.runUrl}`);
  }
  return lines.join('\n');
}

// Reads KEY=value lines from an .env file into an object. Missing file or
// key yields undefined; lines without `=` and comments are ignored.
function parseEnvContent(content) {
  const values = {};
  if (!content) {
    return values;
  }
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      values[match[1]] = match[2].trim();
    }
  }
  return values;
}

// Builds the header input from .env values (as the app sees them) plus the
// CI-only fields. No git, package.json or clock access.
function headerFromEnv(envValues, args) {
  const platform = args.platform === 'android' ? 'android' : 'ios';
  return formatBuildInfoHeader({
    appName: args['app-name'] || 'RN Example',
    appVersion: envValues.KLAVIYO_BUILD_APP_VERSION,
    buildNumber: envValues.KLAVIYO_BUILD_NUMBER,
    platform,
    rnVersion: envValues.KLAVIYO_SDK_VERSION_RN,
    rnRef: envValues.KLAVIYO_SDK_REF_RN,
    nativeVersion:
      platform === 'ios'
        ? envValues.KLAVIYO_SDK_VERSION_IOS
        : envValues.KLAVIYO_SDK_VERSION_ANDROID,
    nativeRef:
      platform === 'ios'
        ? envValues.KLAVIYO_SDK_REF_IOS
        : envValues.KLAVIYO_SDK_REF_ANDROID,
    commit: envValues.KLAVIYO_BUILD_COMMIT,
    sourceLabel: args['source-label'] || envValues.KLAVIYO_BUILD_BRANCH,
    event: args.event,
    built: envValues.KLAVIYO_BUILD_BUILT,
    runUrl: args['run-url'],
  });
}

// --- .env managed block ---

// Replaces existing managed lines (KLAVIYO_SDK_REF_*/KLAVIYO_SDK_VERSION_*)
// and leaves every other line untouched, creating the file when missing.
function updateEnvContent(content, values) {
  const managed = MANAGED_KEYS.map((key) => `${key}=${values[key] || UNKNOWN}`);
  if (content === null) {
    return managed.join('\n') + '\n';
  }
  const kept = content
    .split('\n')
    .filter(
      (line) => !MANAGED_PREFIXES.some((prefix) => line.startsWith(prefix))
    );
  while (kept.length > 0 && kept[kept.length - 1] === '') {
    kept.pop();
  }
  return [...kept, ...managed].join('\n') + '\n';
}

// Reads `--<name> <value>` flags into an object (flags without a value are
// ignored).
// Flags that are switches: set to true without consuming the next token.
// `--flag=<value>` is also supported for value flags.
const BOOLEAN_FLAGS = new Set([
  'print',
  'print-header',
  'print-versions',
  'from-env',
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const inline = argv[i].match(/^--([a-z-]+)=(.*)$/);
    if (inline) {
      args[inline[1]] = inline[2];
      continue;
    }
    const flag = argv[i].match(/^--([a-z-]+)$/);
    if (!flag) {
      continue;
    }
    if (BOOLEAN_FLAGS.has(flag[1])) {
      // A bare boolean flag is true; an explicit value still parses.
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args[flag[1]] = argv[i + 1];
        i++;
      } else {
        args[flag[1]] = true;
      }
      continue;
    }
    if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[flag[1]] = argv[i + 1];
      i++;
    }
  }
  return args;
}

// UTC timestamp in the `YYYY-MM-DD HH:MM UTC` form.
function utcNow() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

// --- CI requirements ---

// A truthy CI value ("true", "1"); the GitHub runner sets CI=true for every
// step. An explicit "false"/"0"/empty is local.
function isCi(env = process.env) {
  const value = String(env.CI || '')
    .trim()
    .toLowerCase();
  return value !== '' && value !== 'false' && value !== '0';
}

// Under CI the commit and branch that get stamped into the app must be passed
// in explicitly (on a label deploy GITHUB_SHA and GITHUB_REF_NAME are the
// merge commit and "<n>/merge"), and an empty value is not "absent": it is an
// error, never a fallback to git or GITHUB_*. Returns the list of problems
// (empty when fine). Local runs keep the git fallback.
function ciRequirementErrors(args, env = process.env) {
  if (!isCi(env)) {
    return [];
  }
  return ['commit', 'branch']
    .filter((flag) => {
      const value = args[flag];
      return typeof value !== 'string' || value.trim() === '';
    })
    .map(
      (flag) =>
        `--${flag} is required when CI is set and must not be empty (no fallback to git or GITHUB_* is used)`
    );
}

// --- resolution against this checkout ---

function resolveAll(options = {}) {
  const pkgContent = readFileOrNull(path.join(REPO_ROOT, 'package.json'));
  const version = rnVersion(pkgContent);

  // Detached CI checkouts report "HEAD"; prefer the Actions env refs and
  // drop a literal "HEAD" from --abbrev-ref.
  const tagOutput = git(['tag', '--points-at', 'HEAD'], REPO_ROOT);
  const tagNames = tagOutput ? tagOutput.split('\n') : [];
  const abbrevRef = git(['rev-parse', '--abbrev-ref', 'HEAD'], REPO_ROOT);
  const branch =
    options.branch ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF_NAME ||
    (abbrevRef && abbrevRef !== 'HEAD' ? abbrevRef : null);
  const sha = options.commit
    ? options.commit.slice(0, 7)
    : git(['rev-parse', '--short=7', 'HEAD'], REPO_ROOT);
  const rn = rnRef(version, {
    tagNames,
    branch,
    sha,
    dirty: isDirty({
      commit: options.commit,
      porcelain: options.commit
        ? null
        : git(['status', '--porcelain'], REPO_ROOT),
    }),
  });

  const resolvers = {
    snapshotToRef: (b) => remoteBranchRef(ANDROID_SDK_REPO, b),
    localResolver: (p) => `local:${localRef(p)}`,
  };

  const gradleProperties = readFileOrNull(
    path.join(REPO_ROOT, 'android', 'gradle.properties')
  );
  const androidVersionValue = androidVersion(
    gradleProperties,
    'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion'
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

  const iosLockContent = readFileOrNull(
    path.join(EXAMPLE_DIR, 'ios', 'Podfile.lock')
  );
  const podspecContent = readFileOrNull(
    path.join(REPO_ROOT, 'klaviyo-react-native-sdk.podspec')
  );
  const ios = iosRef(
    {
      lockContent: iosLockContent,
      podfileContent: readFileOrNull(path.join(EXAMPLE_DIR, 'ios', 'Podfile')),
      podspecContent,
    },
    resolvers
  );
  const iosVersionValue = iosVersion({
    lockContent: iosLockContent,
    podspecContent,
  });

  return {
    KLAVIYO_SDK_REF_RN: rn,
    KLAVIYO_SDK_REF_ANDROID: android,
    KLAVIYO_SDK_REF_IOS: ios,
    KLAVIYO_SDK_VERSION_RN: version,
    KLAVIYO_SDK_VERSION_ANDROID: androidVersionValue,
    KLAVIYO_SDK_VERSION_IOS: iosVersionValue,
    KLAVIYO_BUILD_APP_VERSION: version,
    KLAVIYO_BUILD_NUMBER: options.build || '',
    KLAVIYO_BUILD_COMMIT: sha || '',
    KLAVIYO_BUILD_BRANCH: branch || '',
    KLAVIYO_BUILD_BUILT: options.built || utcNow(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (process.argv.includes('--print-header') && args['from-env']) {
    const envFile = args['env-file']
      ? path.resolve(args['env-file'])
      : ENV_FILE;
    process.stdout.write(
      headerFromEnv(parseEnvContent(readFileOrNull(envFile)), args) + '\n'
    );
    return;
  }
  const needsBuildInfo =
    !process.argv.includes('--print') &&
    !process.argv.includes('--print-versions');
  const problems = needsBuildInfo ? ciRequirementErrors(args) : [];
  if (problems.length > 0) {
    process.stderr.write(`sdk-ref.js: ${problems.join('\nsdk-ref.js: ')}\n`);
    process.exit(1);
  }
  const resolved = resolveAll(args);
  if (process.argv.includes('--print')) {
    process.stdout.write(
      `RN SDK:      ${resolved.KLAVIYO_SDK_REF_RN}\n` +
        `Android SDK: ${resolved.KLAVIYO_SDK_REF_ANDROID}\n` +
        `iOS SDK:     ${resolved.KLAVIYO_SDK_REF_IOS}\n`
    );
    return;
  }
  if (process.argv.includes('--print-versions')) {
    process.stdout.write(
      `RN:      ${resolved.KLAVIYO_SDK_VERSION_RN}\n` +
        `Android: ${resolved.KLAVIYO_SDK_VERSION_ANDROID}\n` +
        `iOS:     ${resolved.KLAVIYO_SDK_VERSION_IOS}\n`
    );
    return;
  }
  if (process.argv.includes('--print-header')) {
    const platform = args.platform === 'android' ? 'android' : 'ios';
    process.stdout.write(
      formatBuildInfoHeader({
        appName: args['app-name'] || 'RN Example',
        appVersion: resolved.KLAVIYO_BUILD_APP_VERSION,
        buildNumber: resolved.KLAVIYO_BUILD_NUMBER,
        platform,
        rnVersion: resolved.KLAVIYO_SDK_VERSION_RN,
        rnRef: resolved.KLAVIYO_SDK_REF_RN,
        nativeVersion:
          platform === 'ios'
            ? resolved.KLAVIYO_SDK_VERSION_IOS
            : resolved.KLAVIYO_SDK_VERSION_ANDROID,
        nativeRef:
          platform === 'ios'
            ? resolved.KLAVIYO_SDK_REF_IOS
            : resolved.KLAVIYO_SDK_REF_ANDROID,
        commit: resolved.KLAVIYO_BUILD_COMMIT,
        sourceLabel: args['source-label'] || resolved.KLAVIYO_BUILD_BRANCH,
        event: args.event,
        built: resolved.KLAVIYO_BUILD_BUILT,
        runUrl: args['run-url'],
      }) + '\n'
    );
    return;
  }
  const content = updateEnvContent(readFileOrNull(ENV_FILE), resolved);
  fs.writeFileSync(ENV_FILE, content);
  process.stdout.write(`Wrote SDK refs to ${ENV_FILE}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  UNKNOWN,
  androidRef,
  ciRequirementErrors,
  isCi,
  androidVersion,
  formatBuildInfoHeader,
  formatVersionRef,
  iosRef,
  iosVersion,
  isCommit,
  isSemver,
  localRef,
  headerFromEnv,
  parseArgs,
  parseEnvContent,
  isDirty,
  parseLockCommit,
  parseLockVersion,
  parsePodfileOverride,
  parsePodspecVersion,
  parseSavedCommentVersion,
  refPart,
  remoteBranchRef,
  resolveAll,
  rnRef,
  rnVersion,
  updateEnvContent,
  utcNow,
  valueOrMissing,
};
