export interface SdkInfoEntry {
  label: string;
  // Fully formatted row value; the modal renders it as-is.
  version?: string;
}

export const MISSING = '—';

// Env surface the build-info rows read from; keys mirror the managed block
// that example/scripts/sdk-ref.js writes into example/.env.
export interface SdkInfoEnv {
  KLAVIYO_SDK_REF_RN?: string;
  KLAVIYO_SDK_REF_ANDROID?: string;
  KLAVIYO_SDK_REF_IOS?: string;
  KLAVIYO_SDK_VERSION_RN?: string;
  KLAVIYO_SDK_VERSION_ANDROID?: string;
  KLAVIYO_SDK_VERSION_IOS?: string;
  KLAVIYO_BUILD_APP_VERSION?: string;
  KLAVIYO_BUILD_NUMBER?: string;
  KLAVIYO_BUILD_COMMIT?: string;
  KLAVIYO_BUILD_BRANCH?: string;
  KLAVIYO_BUILD_BUILT?: string;
}

export type NativePlatform = 'ios' | 'android';

const isMissing = (value: string | undefined): boolean =>
  !value || value === 'unknown';

// Strips a leading `<version> ` so a ref that embeds the version
// (`2.5.1 (branch@sha7)`) reduces to its ref part (`branch@sha7`).
export const refPart = (ref: string, version: string): string =>
  ref.startsWith(`${version} (`) ? ref.slice(version.length + 2, -1) : ref;

export const valueOrMissing = (value: string | undefined): string =>
  isMissing(value) ? MISSING : (value as string);

// "version · ref", omitting the ref when it is empty or equals the version.
export const formatVersionRef = (
  version: string | undefined,
  ref: string | undefined
): string => {
  const versionText = valueOrMissing(version);
  if (isMissing(ref)) {
    return versionText;
  }
  const short = refPart(ref as string, versionText);
  return !short || short === versionText
    ? versionText
    : `${versionText} · ${short}`;
};

const appRowText = (env: SdkInfoEnv): string => {
  const version = env.KLAVIYO_BUILD_APP_VERSION;
  const build = env.KLAVIYO_BUILD_NUMBER;
  if (isMissing(version)) {
    return isMissing(build) ? MISSING : `(${build})`;
  }
  return isMissing(build) ? (version as string) : `${version} (${build})`;
};

// One row per data point; only the native SDK for the running platform.
export const buildSdkInfoEntries = (
  env: SdkInfoEnv,
  platform: NativePlatform
): SdkInfoEntry[] => [
  { label: 'App', version: appRowText(env) },
  {
    label: 'Klaviyo RN SDK',
    version: formatVersionRef(
      env.KLAVIYO_SDK_VERSION_RN,
      env.KLAVIYO_SDK_REF_RN
    ),
  },
  platform === 'android'
    ? {
        label: 'Klaviyo Android SDK',
        version: formatVersionRef(
          env.KLAVIYO_SDK_VERSION_ANDROID,
          env.KLAVIYO_SDK_REF_ANDROID
        ),
      }
    : {
        label: 'Klaviyo iOS SDK',
        version: formatVersionRef(
          env.KLAVIYO_SDK_VERSION_IOS,
          env.KLAVIYO_SDK_REF_IOS
        ),
      },
  {
    label: 'App commit',
    version: isMissing(env.KLAVIYO_BUILD_COMMIT)
      ? MISSING
      : `${env.KLAVIYO_BUILD_COMMIT} on ${valueOrMissing(
          env.KLAVIYO_BUILD_BRANCH
        )}`,
  },
  { label: 'Built', version: valueOrMissing(env.KLAVIYO_BUILD_BUILT) },
];

export interface BuildInfoHeaderInput {
  appName: string;
  appVersion?: string;
  buildNumber?: string;
  platform: NativePlatform;
  rnVersion?: string;
  rnRef?: string;
  nativeVersion?: string;
  nativeRef?: string;
  commit?: string;
  sourceLabel?: string;
  event?: string;
  runUrl?: string;
}

// The notes header block shared with CI: one App line, the RN SDK row, the
// native SDK row for the build's platform, a Commit line, and a CI run line
// only when a run URL is given. In-app copies omit the CI line and the
// event, passing the branch as the source label.
export const formatBuildInfoHeader = (input: BuildInfoHeaderInput): string => {
  const appLine = `${input.appName} ${
    isMissing(input.appVersion) ? MISSING : input.appVersion
  }${isMissing(input.buildNumber) ? '' : ` (${input.buildNumber})`}`;
  const source = valueOrMissing(input.sourceLabel);
  const commitLine = `Commit: ${valueOrMissing(input.commit)} on ${source}${
    input.event ? ` (${input.event})` : ''
  }`;
  const lines = [
    appLine,
    `Klaviyo RN SDK ${formatVersionRef(input.rnVersion, input.rnRef)}`,
    `Klaviyo ${
      input.platform === 'ios' ? 'iOS' : 'Android'
    } SDK ${formatVersionRef(input.nativeVersion, input.nativeRef)}`,
    commitLine,
  ];
  if (input.runUrl) {
    lines.push(`CI run: ${input.runUrl}`);
  }
  return lines.join('\n');
};

// Copy block built from the app's env: no CI line, branch as source label.
export const buildCopyText = (
  env: SdkInfoEnv,
  platform: NativePlatform,
  appName: string
): string =>
  formatBuildInfoHeader({
    appName,
    appVersion: env.KLAVIYO_BUILD_APP_VERSION,
    buildNumber: env.KLAVIYO_BUILD_NUMBER,
    platform,
    rnVersion: env.KLAVIYO_SDK_VERSION_RN,
    rnRef: env.KLAVIYO_SDK_REF_RN,
    nativeVersion:
      platform === 'ios'
        ? env.KLAVIYO_SDK_VERSION_IOS
        : env.KLAVIYO_SDK_VERSION_ANDROID,
    nativeRef:
      platform === 'ios'
        ? env.KLAVIYO_SDK_REF_IOS
        : env.KLAVIYO_SDK_REF_ANDROID,
    commit: env.KLAVIYO_BUILD_COMMIT,
    sourceLabel: env.KLAVIYO_BUILD_BRANCH,
  });
