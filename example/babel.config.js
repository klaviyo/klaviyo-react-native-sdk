const path = require('path');
const fs = require('fs');

// `pack-and-test.sh setup` writes a marker at the repo root to switch this
// app into "consume the SDK as if it were `npm install`-ed" mode. In that
// mode we skip the workspace-aware Babel config (which aliases the SDK's
// source files back to <repo>/src/) and let standard transforms apply.
// Cleared by `pack-and-test.sh restore`.
//
// Babel caches resolved configs aggressively. Returning a function (rather
// than an object) lets us call `api.cache.using(...)` so the cache key
// includes the marker's existence — flipping the marker invalidates any
// cached transform output produced under the other mode.
const MARKER = path.resolve(__dirname, '..', '.pack-mode-active');

module.exports = function (api) {
  const isPacked = api.cache.using(() => fs.existsSync(MARKER));

  // Build a fresh baseConfig per invocation so that workspace-mode helpers
  // can't mutate a shared object across marker flips (today's
  // `react-native-builder-bob/babel-config` doesn't mutate, but the safety
  // shouldn't depend on a peer dep's implementation detail).
  const baseConfig = {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      // allowUndefined: true so cold clones (no .env) build and show the friendly
      // warning UI rather than failing at Metro transform time. The runtime check
      // in App.tsx handles the missing-key case gracefully.
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          allowUndefined: true,
        },
      ],
    ],
  };

  if (isPacked) {
    return baseConfig;
  }

  const { getConfig } = require('react-native-builder-bob/babel-config');
  const pkg = require('../package.json');
  const root = path.resolve(__dirname, '..');

  return getConfig(baseConfig, { root, pkg });
};
