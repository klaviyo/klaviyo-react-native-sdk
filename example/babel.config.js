const path = require('path');
const fs = require('fs');

// `pack-and-test.sh setup` writes a marker at the repo root to switch this
// app into "consume the SDK as if it were `npm install`-ed" mode. In that
// mode we skip the workspace-aware Babel config (which aliases the SDK's
// source files back to <repo>/src/) and let standard transforms apply.
// Cleared by `pack-and-test.sh restore`.
const isPacked = fs.existsSync(
  path.resolve(__dirname, '..', '.pack-mode-active')
);

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
  module.exports = baseConfig;
} else {
  const { getConfig } = require('react-native-builder-bob/babel-config');
  const pkg = require('../package.json');
  const root = path.resolve(__dirname, '..');

  module.exports = getConfig(baseConfig, { root, pkg });
}
