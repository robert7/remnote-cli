# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-18

### Added
- Initial bootstrap for `remnote-cli` npm package.
- TypeScript-based executable CLI with hello-world command output.
- Project tooling scripts: `node-check.sh`, `code-quality.sh`, `publish-to-npm.sh`.
- Initial repository metadata and packaging configuration for npm publication.
- Basic Vitest test suite (`test/setup.ts`, `test/unit/cli.test.ts`) and coverage config.
- GitHub Actions CI workflow to run code quality checks and tests on push/PR.
- Agent collaboration scaffolding copied from `remnote-mcp-server` (`.agents/*` with empty `.agents/execplans/`).
