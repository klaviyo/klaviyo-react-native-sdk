const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = getConfig(
  {
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
  },
  { root, pkg }
);
