# Kilocode Resolver Action

[![GitHub release](https://img.shields.io/github/v/release/zeromodern/kilocode-resolver-action)](https://github.com/zeromodern/kilocode-resolver-action/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Automatically fix GitHub issues and pull requests using [Kilocode](https://kilo.ai) AI. This action analyzes your codebase, understands the issue context, and generates a fix with a pull request.

## Features

- 🤖 **AI-Powered Fixes** - Uses Kilocode AI to analyze and fix issues automatically
- 🏷️ **Label Triggers** - Trigger fixes by adding a `fix-me` label to issues or PRs
- 💬 **Comment Triggers** - Mention `@kilocode-agent` in comments to trigger fixes
- 🔧 **Configurable** - Customize behavior with repository-level config files
- 🔒 **Secure** - Only authorized users (owners, collaborators, members) can trigger fixes
- 📝 **Draft PRs** - Creates draft PRs by default for human review

## Quick Start

### 1. Get a Kilocode API Key

Sign up at [kilo.ai](https://kilo.ai) to get your API key.

### 2. Add Secrets to Your Repository

Go to your repository's **Settings → Secrets and variables → Actions** and add:

| Secret | Required | Description |
|--------|----------|-------------|
| `KILOCODE_API_KEY` | Yes | Your Kilocode API key |
| `PAT_TOKEN` | No | Personal Access Token for enhanced permissions |
| `PAT_USERNAME` | No | Username for commit attribution |

### 3. Create the Workflow

Create `.github/workflows/kilocode.yml` in your repository:

```yaml
name: Kilocode Auto-Fix

on:
  issues:
    types: [labeled]
  pull_request:
    types: [labeled]
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  pull_request_review:
    types: [submitted]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  auto-fix:
    if: |
      github.event.label.name == 'fix-me' ||
      (
        (github.event_name == 'issue_comment' || github.event_name == 'pull_request_review_comment') &&
        contains(github.event.comment.body, '@kilocode-agent') &&
        (github.event.comment.author_association == 'OWNER' || 
         github.event.comment.author_association == 'COLLABORATOR' || 
         github.event.comment.author_association == 'MEMBER')
      ) ||
      (
        github.event_name == 'pull_request_review' &&
        contains(github.event.review.body, '@kilocode-agent') &&
        (github.event.review.author_association == 'OWNER' || 
         github.event.review.author_association == 'COLLABORATOR' || 
         github.event.review.author_association == 'MEMBER')
      )
    
    uses: zeromodern/kilocode-resolver-action/.github/workflows/kilocode-resolver.yml@v1
    secrets:
      KILOCODE_API_KEY: ${{ secrets.KILOCODE_API_KEY }}
```

### 4. Trigger a Fix

- **Option A**: Add the `fix-me` label to any issue or PR
- **Option B**: Comment `@kilocode-agent` on an issue or PR (must be owner/collaborator/member)

## Usage Options

### Reusable Workflow (Recommended)

The reusable workflow handles all the complexity for you:

```yaml
jobs:
  auto-fix:
    uses: zeromodern/kilocode-resolver-action/.github/workflows/kilocode-resolver.yml@v1
    with:
      target_branch: main
      pr_type: draft
      timeout: 600
    secrets:
      KILOCODE_API_KEY: ${{ secrets.KILOCODE_API_KEY }}
```

### Composite Action

For more control, use the composite action directly:

```yaml
steps:
  - uses: actions/checkout@v4
  
  - uses: zeromodern/kilocode-resolver-action@v1
    with:
      kilocode_api_key: ${{ secrets.KILOCODE_API_KEY }}
      github_token: ${{ secrets.GITHUB_TOKEN }}
      target_branch: main
```

## Configuration

### Workflow Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `target_branch` | `main` | Branch to checkout and create PR against |
| `pr_type` | `draft` | PR type: `draft` or `ready` |
| `timeout` | `600` | Timeout in seconds for Kilocode CLI |
| `runner` | `ubuntu-latest` | GitHub runner to use |
| `macro` | `@kilocode-agent` | Trigger macro for comments |
| `config_path` | Auto-detected | Path to config file |

### Repository Config File

Create a config file to customize Kilocode's behavior. The action looks for config files in this order:

1. Path specified in `config_path` input
2. `.kilocode/config.json`
3. `.github/kilocode.json`

Example `.kilocode/config.json`:

```json
{
  "allowedCommands": [
    "npm", "git", "pnpm", "yarn", "node", "npx",
    "make", "cargo", "python", "pip", "go"
  ],
  "deniedCommands": [
    "rm -rf /", "sudo rm"
  ],
  "enableBrowser": false,
  "enableMcp": true,
  "questionTimeout": 30,
  "retryDelay": 10
}
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedCommands` | `string[]` | Common dev tools | Commands Kilocode can execute |
| `deniedCommands` | `string[]` | Dangerous commands | Commands that are blocked |
| `enableBrowser` | `boolean` | `false` | Allow browser automation |
| `enableMcp` | `boolean` | `true` | Enable MCP (Model Context Protocol) |
| `questionTimeout` | `number` | `30` | Timeout for questions (seconds) |
| `retryDelay` | `number` | `10` | Delay between retries (seconds) |

## Outputs

When using the composite action, these outputs are available:

| Output | Description |
|--------|-------------|
| `has_changes` | Whether changes were made (`true`/`false`) |
| `branch_name` | Name of the created branch |
| `pr_number` | Number of the created PR |
| `pr_url` | URL of the created PR |

## Security

### Authorization

Only users with the following associations can trigger fixes via comments:
- `OWNER` - Repository owner
- `COLLABORATOR` - Repository collaborator
- `MEMBER` - Organization member

### Tokens

- **GITHUB_TOKEN**: Used by default for API operations
- **PAT_TOKEN**: Optional Personal Access Token for enhanced permissions (e.g., triggering other workflows)

### Command Restrictions

By default, Kilocode can only execute common development commands. Dangerous commands like `rm -rf /` are blocked. Customize this in your config file.

## Examples

See the [examples](./examples) directory for:

- [Basic workflow](./examples/basic-workflow.yml) - Simple setup
- [Advanced workflow](./examples/advanced-workflow.yml) - All configuration options
- [Composite action usage](./examples/composite-action-usage.yml) - Custom workflow steps
- [Config file](./examples/kilocode-config.json) - Repository configuration

## Troubleshooting

### Fix not triggered

1. Check that the user has the correct association (OWNER/COLLABORATOR/MEMBER)
2. Verify the `KILOCODE_API_KEY` secret is set
3. Check workflow permissions are correct

### No changes made

1. The issue may need more context or details
2. Check the workflow logs for Kilocode output
3. The fix may require manual intervention

### PR creation failed

1. Verify `PAT_TOKEN` has sufficient permissions
2. Check branch protection rules
3. Ensure the target branch exists

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Kilocode](https://kilo.ai) - AI-powered code generation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Report Issues](https://github.com/zeromodern/kilocode-resolver-action/issues)
