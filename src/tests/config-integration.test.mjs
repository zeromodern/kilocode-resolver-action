/**
 * Integration Tests for Kilocode Config Generation
 * 
 * These tests verify that the config file can be properly generated,
 * written to disk, and read back - simulating what happens in the GitHub Action.
 * 
 * Run with: node src/tests/config-integration.test.mjs
 */

import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import {
  generateKilocodeConfig,
  getConfigPath,
} from '../kilocode-resolver.mjs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}${error.message}${colors.reset}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message = 'Expected true') {
  if (!condition) {
    throw new Error(message);
  }
}

console.log(`\n${colors.cyan}=== Kilocode Config Integration Tests ===${colors.reset}\n`);

// Create a temporary directory for testing
const testDir = join(tmpdir(), `kilocode-test-${Date.now()}`);
const configDir = join(testDir, '.kilocode');
const configPath = join(configDir, 'config.json');

// Setup
console.log(`${colors.yellow}Setting up test directory: ${testDir}${colors.reset}\n`);
mkdirSync(configDir, { recursive: true });

// Test: Write and read config file
test('should write config file to disk', () => {
  const config = generateKilocodeConfig({
    apiKey: 'test-api-key-12345',
    provider: 'openrouter',
    model: 'anthropic/claude-sonnet-4-20250514',
  });
  
  const configJson = JSON.stringify(config, null, 2);
  writeFileSync(configPath, configJson);
  
  assertTrue(existsSync(configPath), 'Config file should exist');
});

test('should read config file from disk', () => {
  const content = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content);
  
  assertTrue(Array.isArray(config.profiles), 'Config should have profiles array');
  assertEqual(config.profiles[0].provider, 'openrouter');
  assertEqual(config.profiles[0].openRouterApiKey, 'test-api-key-12345');
  assertEqual(config.profiles[0].openRouterModelId, 'anthropic/claude-sonnet-4-20250514');
});

test('should have valid JSON structure', () => {
  const content = readFileSync(configPath, 'utf-8');
  
  // This should not throw
  const config = JSON.parse(content);
  
  // Verify required fields exist
  assertTrue(config.profiles !== undefined, 'profiles should exist');
  assertTrue(config.autoApproval !== undefined, 'autoApproval should exist');
  assertTrue(config.autoApproval.enabled !== undefined, 'autoApproval.enabled should exist');
  assertTrue(config.autoApproval.read !== undefined, 'autoApproval.read should exist');
  assertTrue(config.autoApproval.write !== undefined, 'autoApproval.write should exist');
  assertTrue(config.autoApproval.execute !== undefined, 'autoApproval.execute should exist');
});

test('should generate valid config for kilocode provider', () => {
  const config = generateKilocodeConfig({
    apiKey: 'kilo-test-key',
    provider: 'kilocode',
    model: 'anthropic/claude-sonnet-4',
  });
  
  const configJson = JSON.stringify(config, null, 2);
  const kilocodeConfigPath = join(configDir, 'kilocode-config.json');
  writeFileSync(kilocodeConfigPath, configJson);
  
  const readConfig = JSON.parse(readFileSync(kilocodeConfigPath, 'utf-8'));
  assertEqual(readConfig.profiles[0].provider, 'kilocode');
  assertEqual(readConfig.profiles[0].kilocodeToken, 'kilo-test-key');
  assertEqual(readConfig.profiles[0].kilocodeModel, 'anthropic/claude-sonnet-4');
});

test('should generate valid config for anthropic provider', () => {
  const config = generateKilocodeConfig({
    apiKey: 'sk-ant-test-key',
    provider: 'anthropic',
    model: 'claude-sonnet-4.5',
  });
  
  const configJson = JSON.stringify(config, null, 2);
  const anthropicConfigPath = join(configDir, 'anthropic-config.json');
  writeFileSync(anthropicConfigPath, configJson);
  
  const readConfig = JSON.parse(readFileSync(anthropicConfigPath, 'utf-8'));
  assertEqual(readConfig.profiles[0].provider, 'anthropic');
  assertEqual(readConfig.profiles[0].apiKey, 'sk-ant-test-key');
  assertEqual(readConfig.profiles[0].apiModelId, 'claude-sonnet-4.5');
});

test('should simulate GitHub Action config generation for openrouter', () => {
  // Simulate what the GitHub Action does
  const KILOCODE_API_KEY = 'simulated-github-secret';
  const KILOCODE_PROVIDER = 'openrouter';
  const KILOCODE_MODEL = 'anthropic/claude-sonnet-4-20250514';
  
  const config = {
    profiles: [
      {
        id: 'default',
        provider: KILOCODE_PROVIDER,
        openRouterApiKey: KILOCODE_API_KEY,
        openRouterModelId: KILOCODE_MODEL,
      }
    ],
    autoApproval: {
      enabled: true,
      read: { enabled: true, outside: false },
      write: { enabled: true, outside: false, protected: true },
      execute: {
        enabled: true,
        allowed: ['npm', 'git', 'pnpm', 'yarn', 'node', 'npx', 'make', 'cargo', 'python', 'pip'],
        denied: ['rm -rf /', 'sudo'],
      },
      browser: { enabled: false },
      mcp: { enabled: true },
      mode: { enabled: true },
      subtasks: { enabled: true },
      question: { enabled: true, timeout: 30 },
      retry: { enabled: true, delay: 10 },
      todo: { enabled: true },
    },
  };
  
  const configJson = JSON.stringify(config, null, 2);
  const ghActionConfigPath = join(configDir, 'gh-action-config.json');
  writeFileSync(ghActionConfigPath, configJson);
  
  const readConfig = JSON.parse(readFileSync(ghActionConfigPath, 'utf-8'));
  
  // Verify the structure matches what kilocode CLI expects
  assertTrue(Array.isArray(readConfig.profiles), 'Should have profiles array');
  assertEqual(readConfig.profiles[0].id, 'default');
  assertEqual(readConfig.profiles[0].provider, 'openrouter');
  assertEqual(readConfig.profiles[0].openRouterApiKey, KILOCODE_API_KEY);
  assertEqual(readConfig.profiles[0].openRouterModelId, KILOCODE_MODEL);
  assertTrue(readConfig.autoApproval.enabled, 'autoApproval should be enabled');
  assertTrue(readConfig.autoApproval.execute.allowed.includes('npm'), 'npm should be allowed');
});

test('should simulate GitHub Action config generation for kilocode provider', () => {
  // Simulate what the GitHub Action does for kilocode provider
  const KILOCODE_API_KEY = 'kilo-api-key-secret';
  const KILOCODE_PROVIDER = 'kilocode';
  const KILOCODE_MODEL = 'anthropic/claude-sonnet-4';
  
  const config = {
    profiles: [
      {
        id: 'default',
        provider: KILOCODE_PROVIDER,
        kilocodeToken: KILOCODE_API_KEY,
        kilocodeModel: KILOCODE_MODEL,
      }
    ],
    autoApproval: {
      enabled: true,
      read: { enabled: true, outside: false },
      write: { enabled: true, outside: false, protected: true },
      execute: {
        enabled: true,
        allowed: ['npm', 'git', 'pnpm', 'yarn', 'node', 'npx'],
        denied: ['rm -rf /', 'sudo'],
      },
      browser: { enabled: false },
      mcp: { enabled: true },
      mode: { enabled: true },
      subtasks: { enabled: true },
      question: { enabled: true, timeout: 30 },
      retry: { enabled: true, delay: 10 },
      todo: { enabled: true },
    },
  };
  
  const configJson = JSON.stringify(config, null, 2);
  const kiloProviderConfigPath = join(configDir, 'kilo-provider-config.json');
  writeFileSync(kiloProviderConfigPath, configJson);
  
  const readConfig = JSON.parse(readFileSync(kiloProviderConfigPath, 'utf-8'));
  
  // Verify the structure matches what kilocode CLI expects
  assertTrue(Array.isArray(readConfig.profiles), 'Should have profiles array');
  assertEqual(readConfig.profiles[0].id, 'default');
  assertEqual(readConfig.profiles[0].provider, 'kilocode');
  assertEqual(readConfig.profiles[0].kilocodeToken, KILOCODE_API_KEY);
  assertEqual(readConfig.profiles[0].kilocodeModel, KILOCODE_MODEL);
});

test('config path should be correct', () => {
  const path = getConfigPath();
  assertEqual(path, '~/.kilocode/config.json');
});

test('should simulate shell script config generation', () => {
  // This simulates the bash script in action.yml
  const KILOCODE_API_KEY = 'test-key';
  const KILOCODE_PROVIDER = 'openrouter';
  const KILOCODE_MODEL = 'anthropic/claude-sonnet-4-20250514';
  const ALLOWED_COMMANDS = '["npm", "git", "pnpm"]';
  const DENIED_COMMANDS = '["rm -rf /", "sudo"]';
  
  // Build profile config like the shell script does
  let PROFILE_CONFIG;
  if (KILOCODE_PROVIDER === 'kilocode') {
    PROFILE_CONFIG = `"kilocodeToken": "${KILOCODE_API_KEY}", "kilocodeModel": "${KILOCODE_MODEL}"`;
  } else if (KILOCODE_PROVIDER === 'openrouter') {
    PROFILE_CONFIG = `"openRouterApiKey": "${KILOCODE_API_KEY}", "openRouterModelId": "${KILOCODE_MODEL}"`;
  } else if (KILOCODE_PROVIDER === 'anthropic') {
    PROFILE_CONFIG = `"apiKey": "${KILOCODE_API_KEY}", "apiModelId": "${KILOCODE_MODEL}"`;
  } else {
    PROFILE_CONFIG = `"apiKey": "${KILOCODE_API_KEY}", "apiModelId": "${KILOCODE_MODEL}"`;
  }
  
  const configContent = `{
  "profiles": [
    {
      "id": "default",
      "provider": "${KILOCODE_PROVIDER}",
      ${PROFILE_CONFIG}
    }
  ],
  "autoApproval": {
    "enabled": true,
    "read": { "enabled": true, "outside": false },
    "write": { "enabled": true, "outside": false, "protected": true },
    "execute": {
      "enabled": true,
      "allowed": ${ALLOWED_COMMANDS},
      "denied": ${DENIED_COMMANDS}
    },
    "browser": { "enabled": false },
    "mcp": { "enabled": true },
    "mode": { "enabled": true },
    "subtasks": { "enabled": true },
    "question": { "enabled": true, "timeout": 30 },
    "retry": { "enabled": true, "delay": 10 },
    "todo": { "enabled": true }
  }
}`;
  
  const shellConfigPath = join(configDir, 'shell-config.json');
  writeFileSync(shellConfigPath, configContent);
  
  // Verify it's valid JSON
  const readConfig = JSON.parse(readFileSync(shellConfigPath, 'utf-8'));
  assertTrue(Array.isArray(readConfig.profiles), 'Should have profiles array');
  assertEqual(readConfig.profiles[0].provider, 'openrouter');
  assertEqual(readConfig.profiles[0].openRouterApiKey, 'test-key');
});

// Cleanup
console.log(`\n${colors.yellow}Cleaning up test directory${colors.reset}`);
rmSync(testDir, { recursive: true, force: true });

// Summary
console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

if (failed > 0) {
  process.exit(1);
}
