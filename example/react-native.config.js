const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

// `pack-and-test.sh setup` writes a marker at the repo root to switch this
// app into "consume the SDK as if it were `npm install`-ed" mode. In that
// mode we point RN CLI's autolinker at the tarball-extracted SDK in
// node_modules instead of the workspace root. Cleared by
// `pack-and-test.sh restore`.
const isPacked = fs.existsSync(
  path.resolve(__dirname, '..', '.pack-mode-active')
);

const sdkRoot = isPacked
  ? path.join(__dirname, 'node_modules', pkg.name)
  : path.join(__dirname, '..');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    [pkg.name]: {
      root: sdkRoot,
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
  },
};
