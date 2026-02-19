# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added `docs/demo.md` with a CLI demo walkthrough and screenshot showing daemon start, connection status checks, and
  successful search flow.

### Changed

- Updated npm development scripts so `npm run dev` runs the CLI once (no file watching) and added `npm run dev:watch`
  for explicit watch-mode development.
- Updated development setup docs to reflect the new `dev` / `dev:watch` behavior split.
- Updated `README.md` to link the new demo page near the top of the file and from the Documentation index.
- Updated `docs/demo.md` with a new OpenClaw chat screenshot section showing `remnote-cli` status, search, and
  summary-attempt workflow.
- Updated `docs/demo.md` OpenClaw section with a concise limitation note that full REM + children reads are not yet
  available and require bridge-side improvements in `remnote-mcp-bridge`.

## [0.2.0] - 2026-02-18

### Added

- Daemon architecture: background process hosting WebSocket server (:3002) and HTTP control API (:3100).
- WebSocket server for RemNote Bridge plugin connectivity (ported from remnote-mcp-server).
- Daemon lifecycle management: `daemon start`, `daemon stop`, `daemon status` commands.
- PID file tracking at `~/.remnote-cli/daemon.pid` with stale process detection.
- Six bridge commands: `create`, `search`, `read`, `update`, `journal`, `status`.
- JSON output (default, for agentic consumers) and `--text` flag for human-readable output.
- Daemon client (fetch-based HTTP) for CLI-to-daemon communication.
- Pino-based structured logging with optional pino-pretty for TTY.
- Global CLI flags: `--json`, `--text`, `--control-port`, `--verbose`, `--version`.
- Exit codes: 0 (success), 1 (error), 2 (daemon not running), 3 (bridge not connected).
- Integration test suite with 6 workflows (daemon lifecycle, status, create/search, read/update, journal, errors).
- Integration test runner (`run-integration-test.sh`) with interactive confirmation.
- Unit tests for WebSocket server, control server, daemon client, PID utilities, formatter, CLI structure.
- Production dependencies: `ws`, `pino`.
- Dev dependencies: `@types/ws`, `pino-pretty`.
- Architecture documentation (`docs/architecture.md`).
- User guides: installation, daemon management, command reference, integration testing, development setup,
  troubleshooting.
- Updated README with architecture diagram, quick start, command reference, and troubleshooting.
- ExecPlan for daemon implementation (`.agents/execplans/cli-daemon-implementation.md`).

### Changed

- Rewrote `src/cli.ts` from hello-world to full Commander.js program with subcommands and global options.
- Updated `README.md` with a dedicated Documentation section that links all guides under `docs/guides/`.
- Updated `AGENTS.md` to reflect current daemon-based architecture and implemented command/test scope.
- Updated integration tests to require a pre-running daemon (no test-managed daemon start/stop lifecycle).
- Updated integration testing guide to document external daemon prerequisite and revised workflow order.
- Fixed CLI `status` bridge action name to `get_status` for compatibility with current RemNote Bridge plugin.
- Added unit coverage to prevent regressions in status action dispatch.
- Fixed CLI bridge action mappings for `create`, `read`, `update`, and `journal` to use bridge-compatible snake_case names.
- Fixed `update` payload mapping to send `appendContent` for `--append`.
- Added unit coverage for command-to-bridge action and payload mapping.
- Updated `AGENTS.md` with a no-AI-integration-test policy and prominent companion-project context paths.
- Updated `AGENTS.md` companion-project references to sibling-relative `$(pwd)/../...` paths with short project-purpose notes.
- Added terminology aliases in `AGENTS.md` to clarify project name equivalence (MCP server/bridge and companion naming).
- Added status/license/CI/codecov badges at the top of `README.md` to align with companion repository conventions.
- Updated README top description to use the current bridge name and link to `remnote-mcp-bridge`.

## [0.1.0] - 2026-02-18

### Added

- Initial bootstrap for `remnote-cli` npm package.
- TypeScript-based executable CLI with hello-world command output.
- Project tooling scripts: `node-check.sh`, `code-quality.sh`, `publish-to-npm.sh`.
- Initial repository metadata and packaging configuration for npm publication.
- Basic Vitest test suite (`test/setup.ts`, `test/unit/cli.test.ts`) and coverage config.
- GitHub Actions CI workflow to run code quality checks and tests on push/PR.
- Agent collaboration scaffolding copied from `remnote-mcp-server` (`.agents/*` with empty `.agents/execplans/`).
