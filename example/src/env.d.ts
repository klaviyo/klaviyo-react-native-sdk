declare module '@env' {
  // `undefined` at runtime when .env is missing or the key is absent
  // (babel plugin is configured with allowUndefined: true so cold clones
  // compile without a .env file).
  export const KLAVIYO_API_KEY: string | undefined;
}
