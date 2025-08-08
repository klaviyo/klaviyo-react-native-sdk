#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test the adjust-tsconfig functionality
function testAdjustTsConfig() {
  console.log('Testing adjust-tsconfig functionality...\n');

  // Test 1: Check if script exists and is executable
  const scriptPath = path.join(__dirname, 'adjust-tsconfig.js');
  if (fs.existsSync(scriptPath)) {
    console.log('✅ Script exists');
  } else {
    console.log('❌ Script not found');
    return;
  }

  // Test 2: Check if tsconfig.json exists
  const tsConfigPath = path.join(__dirname, '..', 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    console.log('✅ tsconfig.json exists');
  } else {
    console.log('❌ tsconfig.json not found');
    return;
  }

  // Test 3: Check current moduleResolution setting
  try {
    const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf8');
    const tsConfig = JSON.parse(tsConfigContent);
    const currentModuleResolution = tsConfig.compilerOptions?.moduleResolution;
    console.log(`✅ Current moduleResolution: "${currentModuleResolution}"`);
  } catch (error) {
    console.log(`❌ Error reading tsconfig.json: ${error.message}`);
    return;
  }

  // Test 4: Test the script execution
  try {
    const { adjustTsConfig } = require('./adjust-tsconfig.js');
    adjustTsConfig();
    console.log('✅ Script executed successfully');
  } catch (error) {
    console.log(`❌ Error executing script: ${error.message}`);
  }

  console.log('\nTest completed!');
}

if (require.main === module) {
  testAdjustTsConfig();
}

module.exports = { testAdjustTsConfig };
