# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## CRITICAL: Companion Project Context

When additional context is needed, agents SHOULD also inspect the two companion projects:

- Resolve from this repo root (`$(pwd)`): companion repos are sibling directories at `$(pwd)/../...`.
- `$(pwd)/../remnote-mcp-bridge` - RemNote plugin bridge layer; authoritative for WebSocket action names/payload
  contracts used by this CLI.
- `$(pwd)/../remnote-mcp-server` - MCP server companion; useful for shared bridge-contract usage patterns,
  architecture, and troubleshooting flow.

These repos define bridge action contracts and adjacent architecture decisions used by this CLI.

Terminology aliases used across docs and discussions:

- `remnote-mcp-server` = "MCP server" (same project)
- `remnote-mcp-bridge` = "MCP bridge" or "bridge plugin" (same project)
- `remnote-cli` = "CLI companion app" (this repository)

## Project Overview

This is a CLI companion app for the RemNote Bridge plugin. It provides a daemon-backed command-line interface for
agentic workflows (for example OpenClaw integrations), with JSON-first output for machine consumers.

**Current architecture:**

```text
CLI commands (short-lived) ↔ HTTP Control API :3100 ↔ CLI daemon ↔ WebSocket :3002 ↔ RemNote Bridge Plugin ↔ RemNote
```

## Scope and Direction

- This repository is the second companion app to `remnote-mcp-bridge`.
- The first companion app is `remnote-mcp-server`.
- Core daemon lifecycle and bridge command flows are implemented (`create`, `search`, `read`, `update`, `journal`,
  `status`, plus `daemon start|stop|status`).
- Current focus is reliability, docs quality, and release workflow maturity.
- Integration test workflows exist for live RemNote validation (`test/integration/` and `run-integration-test.sh`).

## MANDATORY: Code Change Requirements

ALL code changes MUST follow these requirements:

1. Tests - update/add tests for behavior changes when test coverage exists for the affected area
2. Documentation - update docs where applicable
3. Code quality - run linting/format/type checks
4. Verification - run the relevant checks to verify behavior
5. CHANGELOG.md - document functional and documentation changes

See `.agents/dev-requirements.md` for detailed planning and execution guidelines.

## CRITICAL: Integration Test Execution Policy

AI agents MUST NOT run integration tests in this repository.

- Do not run `./run-integration-test.sh`
- Do not run `npm run test:integration`
- Do run unit/static checks (`typecheck`, `lint`, unit tests) as needed
- Ask the human collaborator to run integration tests and share logs when integration verification is required

## MANDATORY: Documentation Change Requirements

Before making ANY documentation change, read `.agents/dev-documentation.md`.

ALL documentation changes MUST be documented in `CHANGELOG.md`.

## CRITICAL: ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in `.agents/PLANS.md`) from
design to implementation.

## CRITICAL: Git Commit Policy

DO NOT create git commits unless explicitly requested by the user.

- You may use `git add`, `git rm`, `git mv`, and other git commands
- You may stage changes and prepare them for commit
- DO NOT run `git commit` unless asked

See `.agents/dev-workflow.md` for the full workflow details.

## Development Environment

Use `node-check.sh` to ensure Node.js is available through PATH or nvm:

```bash
source ./node-check.sh && npm install
source ./node-check.sh && npm run build
source ./node-check.sh && ./code-quality.sh
```

## Development Commands

```bash
npm install
npm run dev
npm run build
npm start
npm run typecheck
npm test
npm run lint
npm run format:check
npm run test:integration
./code-quality.sh
```

## Publishing

Use the automated workflow:

```bash
./publish-to-npm.sh
```

The script runs quality checks, verifies package contents, performs dry-runs, and publishes with confirmation.
