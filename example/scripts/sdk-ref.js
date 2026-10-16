#!/usr/bin/env node
/*
 * Records which SDK versions and refs the example app builds against, plus
 * build metadata, as KLAVIYO_SDK_REF_*, KLAVIYO_SDK_VERSION_* and
 * KLAVIYO_BUILD_* lines in example/.env (read by the app via react-native-dotenv).
 * Other lines in .env are left untouched.
 *
 *   node scripts/sdk-ref.js [--build <n>] [--app-version <v>] [--commit <sha>] [--branch <name>] [--built <text>]
 *       write the lines to example/.env (the app version defaults to package.json's)
 *   node scripts/sdk-ref.js --print-header --platform <ios|android> [--source-label <s>] [--event <e>] [--run-url <u>]
 *       print the release-notes header from the lines already in example/.env
 *   node scripts/sdk-ref.js --print-sdks --platform <ios|android>
 *       print a one-line SDK summary from example/.env
 *   node scripts/sdk-ref.js --print-build-info --platform <ios|android>
 *       print "<app version> (<build>) · <commit> · <branch> · <SDKs>" from example/.env
 *
 * Metro inlines .env at bundle time; restart it with --reset-cache after a change.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXAMPLE_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(EXAMPLE_DIR, '.env');
const MANAGED = /^KLAVIYO_(SDK_REF_|SDK_VERSION_|BUILD_)/;
const ANDROID_KEY = 'KlaviyoReactNativeSdk_klaviyoAndroidSdkVersion';

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

const git = (...args) => {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const match = (text, re) => (text.match(re) || [])[1] || '';

function resolve(args) {
  const version = JSON.parse(
    read(path.join(REPO_ROOT, 'package.json'))
  ).version;
  const commit = (args.commit || git('rev-parse', 'HEAD')).slice(0, 7);
  const branch = args.branch || git('rev-parse', '--abbrev-ref', 'HEAD');

  const gradle = read(path.join(REPO_ROOT, 'android', 'gradle.properties'));
  const androidPin = match(
    gradle,
    new RegExp(`^${ANDROID_KEY}=(.*)$`, 'm')
  ).trim();
  const androidSaved = match(
    gradle,
    new RegExp(`^# saved: (\\S+)\\n${ANDROID_KEY}=`, 'm')
  );
  const isSemver = /^\d+\.\d+\.\d+/.test(androidPin);

  const lock = read(path.join(EXAMPLE_DIR, 'ios', 'Podfile.lock'));
  const iosVersion = match(lock, /^ {2}- KlaviyoSwift \((.+)\)/m);
  const iosCommit = match(
    lock,
    /^ {2}KlaviyoSwift:\n(?: {4}.*\n)*? {4}:commit: ["']?([0-9a-f]+)/m
  );

  return {
    KLAVIYO_SDK_REF_RN: `${branch}@${commit}`,
    KLAVIYO_SDK_REF_ANDROID: androidPin.replace(/-SNAPSHOT$/, ''),
    KLAVIYO_SDK_REF_IOS: iosCommit
      ? `${iosVersion} (${iosCommit.slice(0, 7)})`
      : iosVersion,
    KLAVIYO_SDK_VERSION_RN: version,
    KLAVIYO_SDK_VERSION_ANDROID: isSemver
      ? androidPin
      : androidSaved || androidPin,
    KLAVIYO_SDK_VERSION_IOS: iosVersion,
    KLAVIYO_BUILD_APP_VERSION: args['app-version'] || version,
    KLAVIYO_BUILD_NUMBER: args.build || '',
    KLAVIYO_BUILD_COMMIT: commit,
    KLAVIYO_BUILD_BRANCH: branch,
    KLAVIYO_BUILD_BUILT:
      args.built ||
      new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
  };
}

function writeEnv(values) {
  const kept = read(ENV_FILE)
    .split('\n')
    .filter((line) => line && !MANAGED.test(line));
  const managed = Object.entries(values).map(
    ([k, v]) => `${k}=${v || 'unknown'}`
  );
  fs.writeFileSync(ENV_FILE, [...kept, ...managed].join('\n') + '\n');
}

function readEnv() {
  const values = {};
  for (const line of read(ENV_FILE).split('\n')) {
    const m = line.match(/^(KLAVIYO_[A-Z_]+)=(.*)$/);
    if (m) values[m[1]] = m[2].trim();
  }
  return values;
}

const dash = (v) => (!v || v === 'unknown' ? '—' : v);

function versionRef(version, ref) {
  const short = ref.startsWith(`${version} (`)
    ? ref.slice(version.length + 2, -1)
    : ref;
  return !ref || ref === 'unknown' || short === version
    ? dash(version)
    : `${dash(version)} · ${short}`;
}

function sdks(env, platform) {
  const native = platform === 'ios' ? 'IOS' : 'ANDROID';
  return [
    `RN ${versionRef(env.KLAVIYO_SDK_VERSION_RN, env.KLAVIYO_SDK_REF_RN || '')}`,
    `${platform === 'ios' ? 'iOS' : 'Android'} ${versionRef(
      env[`KLAVIYO_SDK_VERSION_${native}`],
      env[`KLAVIYO_SDK_REF_${native}`] || ''
    )}`,
  ];
}

function header(env, args) {
  const [rn, native] = sdks(env, args.platform);
  const build = env.KLAVIYO_BUILD_NUMBER;
  const event = args.event ? ` (${args.event})` : '';
  const lines = [
    `RN Example ${dash(env.KLAVIYO_BUILD_APP_VERSION)}${build && build !== 'unknown' ? ` (${build})` : ''}`,
    `Klaviyo RN SDK ${rn.slice(3)}`,
    `Klaviyo ${native.replace(' ', ' SDK ')}`,
    `Commit: ${dash(env.KLAVIYO_BUILD_COMMIT)} on ${dash(args['source-label'] || env.KLAVIYO_BUILD_BRANCH)}${event}`,
    `Built: ${dash(env.KLAVIYO_BUILD_BUILT)}`,
  ];
  if (args['run-url']) lines.push(`CI run: ${args['run-url']}`);
  return lines.join('\n');
}

function buildInfo(env, platform) {
  const build = env.KLAVIYO_BUILD_NUMBER;
  return [
    `${dash(env.KLAVIYO_BUILD_APP_VERSION)}${build && build !== 'unknown' ? ` (${build})` : ''}`,
    dash(env.KLAVIYO_BUILD_COMMIT),
    dash(env.KLAVIYO_BUILD_BRANCH),
    ...sdks(env, platform),
  ].join(' · ');
}

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const key = argv[i].slice(2);
  const takesValue = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--');
  args[key] = takesValue ? argv[++i] : true;
}

if (args['print-header']) {
  console.log(header(readEnv(), args));
} else if (args['print-build-info']) {
  console.log(buildInfo(readEnv(), args.platform));
} else if (args['print-sdks']) {
  console.log(sdks(readEnv(), args.platform).join(' | '));
} else {
  writeEnv(resolve(args));
  console.log(`Wrote SDK refs to ${ENV_FILE}`);
}
