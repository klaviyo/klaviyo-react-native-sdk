# TypeScript Configuration Adjustment Example

This document demonstrates how the TypeScript configuration adjustment feature works when the SDK is installed in a host project.

## How it works

When `klaviyo-react-native-sdk` is installed via npm/yarn, the `postinstall` script automatically runs and:

1. Searches for the host project's `tsconfig.json` by traversing up the directory tree
2. Reads the host project's TypeScript configuration
3. If the host project has `moduleResolution` set to `"node"`, it updates the SDK's `tsconfig.json` to match
4. This ensures compatibility between the host project and the SDK's TypeScript configuration

## Example Host Project Structure

```
my-react-native-app/
├── package.json
├── tsconfig.json          # Host project config
├── node_modules/
│   └── klaviyo-react-native-sdk/
│       ├── package.json
│       ├── tsconfig.json  # SDK config (will be adjusted)
│       └── scripts/
│           └── adjust-tsconfig.js
└── src/
    └── App.tsx
```

## Example Host Project tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node", // This triggers the adjustment
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "strict": true
  }
}
```

## Before Installation

SDK's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler" // Different from host
    // ... other options
  }
}
```

## After Installation

SDK's `tsconfig.json` (automatically updated):

```json
{
  "compilerOptions": {
    "moduleResolution": "node" // Now matches host project
    // ... other options
  }
}
```

## Manual Execution

You can also manually run the adjustment script:

```bash
# From the host project root
npx klaviyo-react-native-sdk adjust-tsconfig

# Or if you have the SDK source
npm run adjust-tsconfig
```

## Error Handling

The script is designed to be non-intrusive:

- If no host `tsconfig.json` is found, it continues with default configuration
- If parsing errors occur, it logs the error and continues
- It never exits with an error code to avoid breaking the install process
