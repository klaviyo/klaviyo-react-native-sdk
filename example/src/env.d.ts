declare module '@env' {
  // `undefined` at runtime when .env is missing or the key is absent
  // (babel plugin is configured with allowUndefined: true so cold clones
  // compile without a .env file).
  export const KLAVIYO_API_KEY: string | undefined;

  // Written by example/scripts/sdk-ref.js into a managed block of .env
  // (KLAVIYO_SDK_REF_* / KLAVIYO_SDK_VERSION_* / KLAVIYO_BUILD_* prefixes);
  // undefined until that script has run.
  export const KLAVIYO_SDK_REF_RN: string | undefined;
  export const KLAVIYO_SDK_REF_ANDROID: string | undefined;
  export const KLAVIYO_SDK_REF_IOS: string | undefined;
  export const KLAVIYO_SDK_VERSION_RN: string | undefined;
  export const KLAVIYO_SDK_VERSION_ANDROID: string | undefined;
  export const KLAVIYO_SDK_VERSION_IOS: string | undefined;
  export const KLAVIYO_BUILD_APP_VERSION: string | undefined;
  export const KLAVIYO_BUILD_NUMBER: string | undefined;
  export const KLAVIYO_BUILD_COMMIT: string | undefined;
  export const KLAVIYO_BUILD_BRANCH: string | undefined;
  export const KLAVIYO_BUILD_BUILT: string | undefined;
}
