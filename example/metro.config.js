const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('@react-native/metro-config');

// `pack-and-test.sh setup` writes a marker at the repo root to switch this
// app into "consume the SDK as if it were `npm install`-ed" mode. In that
// mode we skip the workspace-aware Metro config and let standard Node-style
// resolution find the tarball-extracted SDK at example/node_modules/.
// Cleared by `pack-and-test.sh restore`.
const isPacked = fs.existsSync(
  path.resolve(__dirname, '..', '.pack-mode-active')
);

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
if (isPacked) {
  module.exports = getDefaultConfig(__dirname);
} else {
  const { getConfig } = require('react-native-builder-bob/metro-config');
  const pkg = require('../package.json');
  const root = path.resolve(__dirname, '..');

  module.exports = getConfig(getDefaultConfig(__dirname), {
    root,
    pkg,
    project: __dirname,
  });
}
