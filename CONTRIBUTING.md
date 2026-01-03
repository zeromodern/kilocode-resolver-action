# Contributing to Kilocode Resolver Action

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something useful together.

## How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use a clear, descriptive title
3. Include steps to reproduce the issue
4. Provide relevant logs or error messages
5. Mention your environment (runner, Node version, etc.)

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the use case and expected behavior
3. Explain why this would be useful to others

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes thoroughly
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 22.x or later
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/kilocode-resolver-action.git
cd kilocode-resolver-action

# Create a branch
git checkout -b feature/your-feature

# Make changes and test
```

### Testing

Test your changes by:

1. Creating a test repository
2. Setting up the workflow with your fork
3. Triggering the action with a test issue

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (v1 → v2): Breaking changes
- **MINOR** (v1.0 → v1.1): New features, backward compatible
- **PATCH** (v1.0.0 → v1.0.1): Bug fixes, backward compatible

The `v1` tag always points to the latest v1.x.x release.

## Release Process

1. Update version in relevant files
2. Update CHANGELOG.md
3. Create a release tag (e.g., `v1.2.0`)
4. Update the major version tag (`v1`)

## Style Guide

### YAML

- Use 2-space indentation
- Quote strings when they contain special characters
- Use descriptive step names

### Documentation

- Keep README concise but comprehensive
- Include examples for all features
- Update docs when changing functionality

## Questions?

Open an issue with the `question` label or reach out to the maintainers.

Thank you for contributing! 🎉
