/**
 * Tests for Kilocode Resolver Logic Module
 * 
 * Run with: node src/tests/kilocode-resolver.test.mjs
 */

import {
  parseGitHubEvent,
  generatePrompt,
  generateKilocodeConfig,
  generateBranchName,
  generateCommitMessage,
  generatePRBody,
  generateResultComment,
  validateEnvironment,
  buildKilocodeCommand,
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

function assertDeepEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
  }
}

function assertTrue(condition, message = 'Expected true') {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFalse(condition, message = 'Expected false') {
  if (condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, substring, message = '') {
  if (!text.includes(substring)) {
    throw new Error(`${message}\nExpected "${text}" to include "${substring}"`);
  }
}

console.log(`\n${colors.cyan}=== Kilocode Resolver Tests ===${colors.reset}\n`);

// parseGitHubEvent tests
console.log(`${colors.yellow}parseGitHubEvent${colors.reset}`);

test('should trigger on workflow_call event', () => {
  const event = { event_name: 'workflow_call' };
  const result = parseGitHubEvent(event);
  assertTrue(result.shouldTrigger);
  assertEqual(result.triggerReason, 'workflow_call');
});

test('should trigger on fix-me label', () => {
  const event = {
    event_name: 'issues',
    label: { name: 'fix-me' },
    issue: { number: 42 },
  };
  const result = parseGitHubEvent(event);
  assertTrue(result.shouldTrigger);
  assertEqual(result.triggerReason, 'fix-me label');
  assertEqual(result.issueNumber, 42);
  assertEqual(result.issueType, 'issue');
});

test('should not trigger on other labels', () => {
  const event = {
    event_name: 'issues',
    label: { name: 'bug' },
    issue: { number: 42 },
  };
  const result = parseGitHubEvent(event);
  assertFalse(result.shouldTrigger);
});

test('should trigger on issue comment with macro from owner', () => {
  const event = {
    event_name: 'issue_comment',
    comment: {
      body: 'Please fix this @kilocode-agent',
      author_association: 'OWNER',
      id: 123,
    },
    issue: { number: 42 },
  };
  const result = parseGitHubEvent(event);
  assertTrue(result.shouldTrigger);
  assertEqual(result.commentId, 123);
  assertEqual(result.issueNumber, 42);
});

test('should trigger on issue comment with macro from collaborator', () => {
  const event = {
    event_name: 'issue_comment',
    comment: {
      body: '@kilocode-agent please help',
      author_association: 'COLLABORATOR',
      id: 456,
    },
    issue: { number: 10 },
  };
  const result = parseGitHubEvent(event);
  assertTrue(result.shouldTrigger);
});

test('should trigger on issue comment with macro from member', () => {
  const event = {
    event_name: 'issue_comment',
    comment: {
      body: '@kilocode-agent',
      author_association: 'MEMBER',
      id: 789,
    },
    issue: { number: 5 },
  };
  const result = parseGitHubEvent(event);
  assertTrue(result.shouldTrigger);
});

test('should not trigger on issue comment from non-authorized user', () => {
  const event = {
    event_name: 'issue_comment',
    comment: {
      body: '@kilocode-agent please fix',
      author_association: 'CONTRIBUTOR',
      id: 999,
    },
    issue: { number: 42 },
  };
  const result = parseGitHubEvent(event);
  assertFalse(result.shouldTrigger);
});

test('should not trigger on issue comment without macro', () => {
  const event = {
    event_name: 'issue_comment',
    comment: {
      body: 'This is a regular comment',
      author_association: 'OWNER',
      id: 111,
    },
    issue: { number: 42 },
  };
  const result = parseGitHubEvent(event);
  assertFalse(result.shouldTrigger);
});

test('should trigger on PR review with macro', () => {
  const event = {
    event_name: 'pull_request_review',
    review: {
      body: '@kilocode-agent please fix the tests',
      author_association: 'OWNER',
      id: 222,
    },
    pull_request: { number: 100 },
  };
  const result = parseGitHubEvent(event);
  assertTrue(result.shouldTrigger);
  assertEqual(result.commentId, 222);
  assertEqual(result.issueNumber, 100);
  assertEqual(result.issueType, 'pr');
});

test('should detect PR type from pull_request field', () => {
  const event = {
    event_name: 'issues',
    label: { name: 'fix-me' },
    issue: { number: 42, pull_request: {} },
  };
  const result = parseGitHubEvent(event);
  assertEqual(result.issueType, 'pr');
});

test('should use custom macro', () => {
  const event = {
    event_name: 'issue_comment',
    macro: '@custom-bot',
    comment: {
      body: 'Hey @custom-bot fix this',
      author_association: 'OWNER',
      id: 333,
    },
    issue: { number: 42 },
  };
  const result = parseGitHubEvent(event);
  assertTrue(result.shouldTrigger);
  assertIncludes(result.triggerReason, '@custom-bot');
});

// generatePrompt tests
console.log(`\n${colors.yellow}generatePrompt${colors.reset}`);

test('should generate prompt with title and body', () => {
  const details = {
    title: 'Bug: App crashes on startup',
    body: 'When I run the app, it crashes immediately.',
  };
  const prompt = generatePrompt(details);
  assertIncludes(prompt, 'Bug: App crashes on startup');
  assertIncludes(prompt, 'When I run the app, it crashes immediately.');
  assertIncludes(prompt, 'Please fix the following issue');
});

test('should handle empty body', () => {
  const details = {
    title: 'Fix something',
    body: '',
  };
  const prompt = generatePrompt(details);
  assertIncludes(prompt, 'Fix something');
  assertIncludes(prompt, 'No description provided.');
});

test('should handle null body', () => {
  const details = {
    title: 'Fix something',
    body: null,
  };
  const prompt = generatePrompt(details);
  assertIncludes(prompt, 'No description provided.');
});

// generateKilocodeConfig tests
console.log(`\n${colors.yellow}generateKilocodeConfig${colors.reset}`);

test('should generate default config', () => {
  const config = generateKilocodeConfig();
  assertTrue(config.autoApproval.enabled);
  assertTrue(config.autoApproval.read.enabled);
  assertFalse(config.autoApproval.read.outside);
  assertTrue(config.autoApproval.write.enabled);
  assertFalse(config.autoApproval.browser.enabled);
  assertTrue(config.autoApproval.execute.allowed.includes('npm'));
  assertTrue(config.autoApproval.execute.denied.includes('sudo'));
});

test('should allow custom allowed commands', () => {
  const config = generateKilocodeConfig({
    allowedCommands: ['custom-cmd'],
  });
  assertDeepEqual(config.autoApproval.execute.allowed, ['custom-cmd']);
});

test('should allow custom denied commands', () => {
  const config = generateKilocodeConfig({
    deniedCommands: ['dangerous-cmd'],
  });
  assertDeepEqual(config.autoApproval.execute.denied, ['dangerous-cmd']);
});

test('should allow enabling browser', () => {
  const config = generateKilocodeConfig({ enableBrowser: true });
  assertTrue(config.autoApproval.browser.enabled);
});

test('should allow custom question timeout', () => {
  const config = generateKilocodeConfig({ questionTimeout: 60 });
  assertEqual(config.autoApproval.question.timeout, 60);
});

// generateBranchName tests
console.log(`\n${colors.yellow}generateBranchName${colors.reset}`);

test('should generate branch name with issue number', () => {
  const branchName = generateBranchName(42, 1704067200000);
  assertEqual(branchName, 'kilocode-fix-42-1704067200');
});

test('should use current timestamp by default', () => {
  const branchName = generateBranchName(123);
  assertTrue(branchName.startsWith('kilocode-fix-123-'));
  const timestamp = parseInt(branchName.split('-').pop());
  assertTrue(timestamp > 0);
});

// generateCommitMessage tests
console.log(`\n${colors.yellow}generateCommitMessage${colors.reset}`);

test('should generate commit message with issue number', () => {
  const message = generateCommitMessage(42);
  assertIncludes(message, 'fix: resolve issue #42');
  assertIncludes(message, 'Automated fix by Kilocode');
  assertIncludes(message, 'Co-authored-by: kilocode-agent');
});

// generatePRBody tests
console.log(`\n${colors.yellow}generatePRBody${colors.reset}`);

test('should generate PR body with issue number', () => {
  const body = generatePRBody(42);
  assertIncludes(body, 'fix issue #42');
  assertIncludes(body, 'Closes #42');
  assertIncludes(body, 'Kilocode');
});

// generateResultComment tests
console.log(`\n${colors.yellow}generateResultComment${colors.reset}`);

test('should generate success comment with PR', () => {
  const result = {
    issueNumber: 42,
    hasChanges: true,
    prNumber: 100,
    prUrl: 'https://github.com/owner/repo/pull/100',
    branchName: 'kilocode-fix-42-123',
    repoOwner: 'owner',
    repoName: 'repo',
    runId: '999',
  };
  const comment = generateResultComment(result);
  assertIncludes(comment, '✅');
  assertIncludes(comment, '#100');
  assertIncludes(comment, 'https://github.com/owner/repo/pull/100');
});

test('should generate warning comment when PR creation fails', () => {
  const result = {
    issueNumber: 42,
    hasChanges: true,
    prNumber: null,
    prUrl: null,
    branchName: 'kilocode-fix-42-123',
    repoOwner: 'owner',
    repoName: 'repo',
    runId: '999',
  };
  const comment = generateResultComment(result);
  assertIncludes(comment, '⚠️');
  assertIncludes(comment, 'kilocode-fix-42-123');
});

test('should generate failure comment when no changes', () => {
  const result = {
    issueNumber: 42,
    hasChanges: false,
    prNumber: null,
    prUrl: null,
    branchName: 'kilocode-fix-42-123',
    repoOwner: 'owner',
    repoName: 'repo',
    runId: '999',
  };
  const comment = generateResultComment(result);
  assertIncludes(comment, '❌');
  assertIncludes(comment, 'unable to generate a fix');
  assertIncludes(comment, 'actions/runs/999');
});

// validateEnvironment tests
console.log(`\n${colors.yellow}validateEnvironment${colors.reset}`);

test('should validate with all required vars', () => {
  const env = {
    KILOCODE_API_KEY: 'test-key',
    PAT_TOKEN: 'pat-token',
    PAT_USERNAME: 'user',
  };
  const result = validateEnvironment(env);
  assertTrue(result.valid);
  assertEqual(result.errors.length, 0);
  assertEqual(result.warnings.length, 0);
});

test('should fail without KILOCODE_API_KEY', () => {
  const env = {
    PAT_TOKEN: 'pat-token',
    PAT_USERNAME: 'user',
  };
  const result = validateEnvironment(env);
  assertFalse(result.valid);
  assertTrue(result.errors.some(e => e.includes('KILOCODE_API_KEY')));
});

test('should warn without PAT_TOKEN', () => {
  const env = {
    KILOCODE_API_KEY: 'test-key',
    PAT_USERNAME: 'user',
  };
  const result = validateEnvironment(env);
  assertTrue(result.valid);
  assertTrue(result.warnings.some(w => w.includes('PAT_TOKEN')));
});

test('should warn without PAT_USERNAME', () => {
  const env = {
    KILOCODE_API_KEY: 'test-key',
    PAT_TOKEN: 'pat-token',
  };
  const result = validateEnvironment(env);
  assertTrue(result.valid);
  assertTrue(result.warnings.some(w => w.includes('PAT_USERNAME')));
});

// buildKilocodeCommand tests
console.log(`\n${colors.yellow}buildKilocodeCommand${colors.reset}`);

test('should build default command', () => {
  const cmd = buildKilocodeCommand();
  assertEqual(cmd.command, 'kilocode');
  assertTrue(cmd.args.includes('--auto'));
  assertTrue(cmd.args.includes('--timeout'));
  assertTrue(cmd.args.includes('600'));
});

test('should build command with custom timeout', () => {
  const cmd = buildKilocodeCommand({ timeout: 300 });
  assertTrue(cmd.args.includes('300'));
});

test('should build command with mode', () => {
  const cmd = buildKilocodeCommand({ mode: 'architect' });
  assertTrue(cmd.args.includes('--mode'));
  assertTrue(cmd.args.includes('architect'));
});

// Summary
console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

if (failed > 0) {
  process.exit(1);
}
