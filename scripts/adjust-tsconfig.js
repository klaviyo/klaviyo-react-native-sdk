#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Adjusts the TypeScript configuration based on the host project's settings.
 * If the host project has moduleResolution set to "node", this script will
 * ensure the SDK's tsconfig.json uses "node16" (which is compatible with modern TypeScript features).
 */
function adjustTsConfig() {
  try {
    // Find the host project's tsconfig.json by looking up the directory tree
    let currentDir = process.cwd();
    let hostTsConfigPath = null;
    let maxDepth = 10; // Prevent infinite loops
    let depth = 0;

    // Look for tsconfig.json in the current directory and parent directories
    while (currentDir !== path.dirname(currentDir) && depth < maxDepth) {
      const potentialTsConfig = path.join(currentDir, 'tsconfig.json');
      if (fs.existsSync(potentialTsConfig)) {
        // Check if this is not our own tsconfig.json (avoid self-reference)
        const packageJsonPath = path.join(currentDir, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, 'utf8')
            );
            // If this is our own package, skip it
            if (packageJson.name === 'klaviyo-react-native-sdk') {
              currentDir = path.dirname(currentDir);
              depth++;
              continue;
            }
          } catch (error) {
            // If package.json is malformed, skip this directory
            currentDir = path.dirname(currentDir);
            depth++;
            continue;
          }
        }

        hostTsConfigPath = potentialTsConfig;
        break;
      }
      currentDir = path.dirname(currentDir);
      depth++;
    }

    if (!hostTsConfigPath) {
      console.log(
        'No host project tsconfig.json found. Using default configuration.'
      );
      return;
    }

    // Read the host project's tsconfig.json
    let hostTsConfig;
    try {
      const hostTsConfigContent = fs.readFileSync(hostTsConfigPath, 'utf8');
      hostTsConfig = JSON.parse(hostTsConfigContent);
    } catch (error) {
      console.log(
        `Could not parse host project tsconfig.json: ${error.message}. Using default configuration.`
      );
      return;
    }

    // Check if the host project has moduleResolution set to "node"
    const hostModuleResolution = hostTsConfig.compilerOptions?.moduleResolution;

    if (hostModuleResolution === 'node') {
      // Read our current tsconfig.json
      const ourTsConfigPath = path.join(__dirname, '..', 'tsconfig.json');

      if (!fs.existsSync(ourTsConfigPath)) {
        console.log('Our tsconfig.json not found. Skipping adjustment.');
        return;
      }

      let ourTsConfig;
      try {
        const ourTsConfigContent = fs.readFileSync(ourTsConfigPath, 'utf8');
        ourTsConfig = JSON.parse(ourTsConfigContent);
      } catch (error) {
        console.log(
          `Could not parse our tsconfig.json: ${error.message}. Skipping adjustment.`
        );
        return;
      }

      // Update our moduleResolution to "node16" for better compatibility with modern TypeScript features
      if (ourTsConfig.compilerOptions.moduleResolution !== 'node16') {
        ourTsConfig.compilerOptions.moduleResolution = 'node16';

        // Write the updated tsconfig.json
        fs.writeFileSync(
          ourTsConfigPath,
          JSON.stringify(ourTsConfig, null, 2) + '\n'
        );

        console.log(
          'Updated tsconfig.json moduleResolution to "node16" to match host project and support modern TypeScript features.'
        );
      } else {
        console.log(
          'tsconfig.json already has moduleResolution set to "node16".'
        );
      }
    } else {
      console.log(
        `Host project uses moduleResolution: "${hostModuleResolution || 'undefined'}". No adjustment needed.`
      );
    }
  } catch (error) {
    console.error('Error adjusting TypeScript configuration:', error.message);
    // Don't exit with error code to avoid breaking install process
    console.log('Continuing with default configuration.');
  }
}

// Run the script if called directly
if (require.main === module) {
  adjustTsConfig();
}

module.exports = { adjustTsConfig };
