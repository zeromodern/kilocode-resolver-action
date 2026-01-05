/**
 * Kilocode Resolver Logic Module
 * 
 * This module contains the core logic for the kilocode resolver GitHub Action.
 * It can be tested independently without running in GitHub Actions.
 */

/**
 * Parse GitHub event to extract issue/PR details
 * @param {Object} event - GitHub event payload
 * @returns {Object} Parsed event details
 */
export function parseGitHubEvent(event) {
  const result = {
    issueNumber: null,
    issueType: null,
    commentId: null,
    shouldTrigger: false,
    triggerReason: null,
  };

  // Check for workflow_call (always triggers)
  if (event.event_name === 'workflow_call') {
    result.shouldTrigger = true;
    result.triggerReason = 'workflow_call';
    return result;
  }

  // Check for label events
  if (event.label?.name === 'fix-me') {
    result.shouldTrigger = true;
    result.triggerReason = 'fix-me label';
  }

  // Check for comment/review events with macro
  const macro = event.macro || '@kilocode-agent';
  const validAssociations = ['OWNER', 'COLLABORATOR', 'MEMBER'];

  if (event.event_name === 'issue_comment' || event.event_name === 'pull_request_review_comment') {
    if (event.comment?.body?.includes(macro) && 
        validAssociations.includes(event.comment?.author_association)) {
      result.shouldTrigger = true;
      result.triggerReason = `comment with ${macro}`;
      result.commentId = event.comment?.id;
    }
  }

  if (event.event_name === 'pull_request_review') {
    if (event.review?.body?.includes(macro) && 
        validAssociations.includes(event.review?.author_association)) {
      result.shouldTrigger = true;
      result.triggerReason = `review with ${macro}`;
      result.commentId = event.review?.id;
    }
  }

  // Determine issue number and type
  if (event.pull_request?.number) {
    result.issueNumber = event.pull_request.number;
    result.issueType = 'pr';
  } else if (event.review?.body && event.pull_request?.number) {
    result.issueNumber = event.pull_request.number;
    result.issueType = 'pr';
  } else if (event.issue?.pull_request) {
    result.issueNumber = event.issue.number;
    result.issueType = 'pr';
  } else if (event.issue?.number) {
    result.issueNumber = event.issue.number;
    result.issueType = 'issue';
  }

  return result;
}

/**
 * Generate the prompt for kilocode CLI
 * @param {Object} details - Issue/PR details
 * @returns {string} Generated prompt
 */
export function generatePrompt(details) {
  const { title, body } = details;
  
  return `Please fix the following issue:

Title: ${title}

Description:
${body || 'No description provided.'}

Please analyze the codebase and implement a fix for this issue. Make sure to:
1. Understand the problem described
2. Find the relevant code
3. Implement a proper fix
4. Test your changes if possible`;
}

/**
 * Generate kilocode CLI configuration
 * @param {Object} options - Configuration options
 * @returns {Object} Kilocode config object
 */
export function generateKilocodeConfig(options = {}) {
  const {
    apiKey = '',
    provider = 'openrouter',
    model = 'anthropic/claude-sonnet-4-20250514',
    profileId = 'default',
    allowedCommands = ['npm', 'git', 'pnpm', 'yarn', 'node', 'npx', 'make', 'cargo', 'python', 'pip'],
    deniedCommands = ['rm -rf /', 'sudo'],
    enableBrowser = false,
    enableMcp = true,
    questionTimeout = 30,
    retryDelay = 10,
  } = options;

  // Build the profile based on provider type
  const profile = {
    id: profileId,
    provider,
  };

  // Add provider-specific fields
  if (provider === 'kilocode') {
    profile.kilocodeToken = apiKey;
    profile.kilocodeModel = model;
  } else if (provider === 'openrouter') {
    profile.openRouterApiKey = apiKey;
    profile.openRouterModelId = model;
  } else if (provider === 'anthropic') {
    profile.apiKey = apiKey;
    profile.apiModelId = model;
  } else if (provider === 'openai-native') {
    profile.openAiNativeApiKey = apiKey;
    profile.apiModelId = model;
  } else {
    // Generic fallback
    profile.apiKey = apiKey;
    profile.apiModelId = model;
  }

  return {
    profiles: [profile],
    autoApproval: {
      enabled: true,
      read: {
        enabled: true,
        outside: false,
      },
      write: {
        enabled: true,
        outside: false,
        protected: true,
      },
      execute: {
        enabled: true,
        allowed: allowedCommands,
        denied: deniedCommands,
      },
      browser: {
        enabled: enableBrowser,
      },
      mcp: {
        enabled: enableMcp,
      },
      mode: {
        enabled: true,
      },
      subtasks: {
        enabled: true,
      },
      question: {
        enabled: true,
        timeout: questionTimeout,
      },
      retry: {
        enabled: true,
        delay: retryDelay,
      },
      todo: {
        enabled: true,
      },
    },
  };
}

/**
 * Get the kilocode config file path
 * @returns {string} Config file path
 */
export function getConfigPath() {
  return '~/.kilocode/config.json';
}

/**
 * Generate branch name for the fix
 * @param {number} issueNumber - Issue number
 * @param {number} timestamp - Optional timestamp (defaults to current time)
 * @returns {string} Branch name
 */
export function generateBranchName(issueNumber, timestamp = Date.now()) {
  const ts = Math.floor(timestamp / 1000);
  return `kilocode-fix-${issueNumber}-${ts}`;
}

/**
 * Generate commit message for the fix
 * @param {number} issueNumber - Issue number
 * @returns {string} Commit message
 */
export function generateCommitMessage(issueNumber) {
  return `fix: resolve issue #${issueNumber}

Automated fix by Kilocode

Co-authored-by: kilocode-agent <kilocode-agent@users.noreply.github.com>`;
}

/**
 * Generate PR body
 * @param {number} issueNumber - Issue number
 * @returns {string} PR body
 */
export function generatePRBody(issueNumber) {
  return `This PR was automatically generated by [Kilocode](https://kilo.ai) to fix issue #${issueNumber}.

## Changes
Please review the changes made by the AI agent.

## Related Issue
Closes #${issueNumber}`;
}

/**
 * Generate result comment based on outcome
 * @param {Object} result - Resolution result
 * @returns {string} Comment body
 */
export function generateResultComment(result) {
  const { issueNumber, hasChanges, prNumber, prUrl, branchName, repoOwner, repoName, runId } = result;

  if (hasChanges && prNumber) {
    return `✅ A potential fix has been generated and a draft PR #${prNumber} has been created. Please review the changes at ${prUrl}.`;
  } else if (hasChanges) {
    return `⚠️ Changes were made but PR creation failed. You can view the branch [here](https://github.com/${repoOwner}/${repoName}/tree/${branchName}).`;
  } else {
    return `❌ Kilocode was unable to generate a fix for this issue. The workflow completed but no code changes were made. You can check the [workflow logs](https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}) for more details.`;
  }
}

/**
 * Validate required environment variables
 * @param {Object} env - Environment variables
 * @returns {Object} Validation result
 */
export function validateEnvironment(env) {
  const errors = [];
  const warnings = [];

  if (!env.KILOCODE_API_KEY) {
    errors.push('KILOCODE_API_KEY is required');
  }

  if (!env.PAT_TOKEN) {
    warnings.push('PAT_TOKEN is not set, falling back to GITHUB_TOKEN');
  }

  if (!env.PAT_USERNAME) {
    warnings.push('PAT_USERNAME is not set, will use kilocode-agent');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Build kilocode CLI command
 * @param {Object} options - Command options
 * @returns {Object} Command and arguments
 */
export function buildKilocodeCommand(options = {}) {
  const { timeout = 600, mode = null } = options;
  
  const args = ['--auto', '--timeout', String(timeout)];
  
  if (mode) {
    args.push('--mode', mode);
  }

  return {
    command: 'kilocode',
    args,
  };
}

export default {
  parseGitHubEvent,
  generatePrompt,
  generateKilocodeConfig,
  getConfigPath,
  generateBranchName,
  generateCommitMessage,
  generatePRBody,
  generateResultComment,
  validateEnvironment,
  buildKilocodeCommand,
};
