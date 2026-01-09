module.exports = {
  presets: ['react-native-builder-bob/babel-preset'],
  overrides: [
    {
      // Use hermes parser for RN's mock files which use Flow `as` cast syntax
      test: /node_modules\/react-native\//,
      plugins: [
        ['babel-plugin-syntax-hermes-parser', { parseLangTypes: 'flow' }],
      ],
    },
  ],
};
