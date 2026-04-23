# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added readable `tags` metadata to `search`, `search-tag`, and `read` JSON responses from the shared bridge
  contract, and surfaced those tags in CLI `--text` output.

### Fixed

- Restored live integration assertions for `tags` on plain `search` and `read`, and extended tag-update coverage to
  verify direct `read` output after add/remove operations.

### Documentation

- Updated command and integration-testing docs to remove the deleted bridge limitation note and describe the current
  working tag-readback behavior.

## [0.12.0] - 2026-04-09

### Changed

- Extended the `remnote` skill's failure-handling sequence so a missing browser tool now triggers OpenClaw-managed
  browser CLI recovery (`status` -> `stop` -> `start` -> `open https://www.remnote.com/`) before the agent reports
  RemNote bridge work as unresolved.
- Browser recovery failures now report gateway and plugin-disabled states more precisely, which makes RemNote bridge
  issues easier to diagnose from automation runs.

## [0.11.0] - 2026-03-27

### Added

- Added the `read-table` command for reading Advanced Table data via the bridge, with `--title` / `--rem-id`,
  pagination, column filtering, and text output.
- Added a `companion_info` WebSocket handshake so the bridge sidebar can identify a connected CLI instance and show
  its version.

### Changed

- Changed `read-table` to require exactly one explicit identifier flag: `--title` or `--rem-id`.

### Fixed

- Hardened `run-agent-integration-test.sh` to source `node-check.sh`, build the CLI before daemon control commands,
  surface daemon-log context when startup fails, and stop the CLI daemon it started after runs.

## [0.10.0] - 2026-03-18

### Documentation

- Updated `README.md` command summaries and examples to reflect hierarchical markdown and flashcard creation.
- Linked CLI connection troubleshooting back to the bridge repo's connection lifecycle guide as the single source of truth.

## [0.9.0] - 2026-03-17

### Added

- Added support for hierarchical markdown trees in `create` (`--content`, `--content-file`), `update` (`--append`, `--replace`) and `journal` (`--content`).
  - Flashcards can be created using RemNote markdown syntax (e.g., `::`, `;;`, `>>`) within the `content`.
  - Shell-safe signature in: `create [title] [options]`. Content must be provided via `--content` / `-c` or `--content-file`.

### Changed

- Updated mutating bridge actions (`create_note`, `update_note`, `append_journal`) and CLI commands to return plural `remIds` and `titles` arrays for consistent multi-Rem support.
- Updated `remnote_create_note` input schema:
  - Made `title` optional
  - At least one of `title` or `content` must be provided.
- Refined tag application rules with hierarchical markdown: tags are only applied to the created root or top-level Rems, not to all nested descendants.
- Improved CLI robustness by implementing "argument shifting" detection in `create`, `update`, and `journal` commands. This prevents the shell from incorrectly swallowing global or local flags as option values when arguments (like empty strings) are missing.
- Aligned command docs and tests with the unified `create_note` contract and plural mutating-action responses.

- Renamed the local OpenClaw skill package directory to `skills/` and updated live repository references, including
  the ClawHub upload script path.
- Extended `./code-quality.sh` to validate and package every committed skill under `skills/` using the local
  `skill-creator` tooling before running the Node test suite.
- Improved RemNote skill marketplace discoverability by expanding note/knowledge-base keywords in
  `skills/remnote/SKILL.md` and publishing it with the display name `RemNote Notes`.

### Documentation

- Updated `README.md` and troubleshooting docs to reflect automatic bridge startup on plugin activation; the sidebar
  panel is now optional for status and manual reconnect.
- Clarified that the bridge should reconnect in the background after late daemon startup, with manual `Reconnect`
  remaining available as a faster fallback.

### Attribution

- Most of the cross-repo `create_note` / markdown-tree work in this release was implemented by @Twb06.

## [0.8.0] - 2026-03-04

### Added

- Added file/stdin payload input for write commands to keep command invocations short and allowlist-friendly:
  - `create --content-file <path|->`
  - `update --append-file <path|->`
  - `update --replace-file <path|->`
  - `journal --content-file <path|->`
- Added `journal --content <text>` while keeping backward-compatible positional `journal [content]`.
- Added a shared 100 KB content-size guard for file/stdin write payloads with clear read/size error messages.
- Added update replace semantics:
  - `update --replace <text>`
  - `update --replace-file <path|->`
- Added CLI validation that rejects mixed append+replace content flags in one update call.

### Changed

- Updated command docs and README examples to prefer file-based write payload flags.
- Updated OpenClaw `remnote` skill guidance to prefer file-based write payloads and mark inline/positional/stdin forms
  as discouraged defaults.

## [0.7.0] - 2026-03-01

### Added

- Added OpenClaw skill docs under `openclaw-skill/`:
  - `openclaw-skill/remnote/SKILL.md` with read-first defaults, strict `confirm write` gating for mutating commands,
    bridge/CLI `0.x` compatibility checks, example trigger phrases for OpenClaw auto-activation, and blue `🌀` emoji.
  - `openclaw-skill/README.md` with repository-facing overview of the skill package.
- Added `openclaw-skill/upload-to-clawhub.sh` to publish the local `remnote` skill to ClawHub using the current
  `package.json` version, with preview-only default, preview auth precheck via `clawhub whoami`, and explicit
  `--publish` opt-in for live publish.

### Changed

- Expanded `docs/guides/command-reference.md` to fully document daemon subcommands, global flags, option defaults,
  option-interaction rules, exit codes, and representative usage patterns for automation consumers.
- Rewrote `AGENTS.md` as a concise repo map and aligned it to the shared cross-repo section template, matching current
  daemon command/contract guidance and removing stale or contradictory instruction detail.
- `read` now documents and passes through `--include-content structured`, aligning CLI read behavior/docs with
  structured hierarchy traversal use-cases.
- `openclaw-skill/remnote-kb-navigation/SKILL.md` is now a user-agnostic template with explicit placeholder tokens and
  "stop if uncustomized" guardrails, plus `openclaw-skill/remnote-kb-navigation/CUSTOMIZATION.md` for per-user setup.
- `openclaw-skill/remnote/SKILL.md` now clarifies that `remnote-kb-navigation` should be used only when available and
  customized for the current user.

### Fixed

- Added regression coverage ensuring `read --include-content structured` maps to `read_note` payloads without dropping
  `includeContent`.

## [0.6.0] - 2026-02-25

### Added

- `status` now includes `cliVersion` and `version_warning`, using bridge `hello` handshake tracking to surface
  bridge/CLI 0.x minor-version mismatches.
- Added `search-tag <tag>`, dispatching `search_by_tag` with the same content controls as `search`
  (`--include-content`, `--depth`, `--child-limit`, `--max-content-length`).
- `search` now supports `--include-content structured`, exposing bridge `contentStructured` results in JSON output.
- `search --text` and `read --text` now show parent context when available.

### Changed

- **BREAKING**: `--include-content` changed from boolean flag to string mode (`none`, `markdown`, `structured`).
- **BREAKING**: CLI no longer expects bridge `detail` in `search`/`read` JSON responses; text output now uses
  `headline`/`title`.
- Default `read` depth increased to 5, and both `search`/`read` now support `--child-limit` and
  `--max-content-length`.
- `read --text` output was restructured to include headline/type/aliases/card-direction/content metadata.

### Fixed

- `status` now reports compatibility warnings for legacy 0.5.x bridge plugins that do not send `hello`, by falling
  back to `pluginVersion` from `get_status`.
- Improved stability of search/read mode handling in test automation (mode-specific response-shape assertions).

## [0.5.0] - 2026-02-21

### Added

- Added `docs/demo.md` with a CLI demo walkthrough and an OpenClaw usage example covering daemon status checks and
  search workflow.

### Changed

- Version advanced from `0.2.0` to `0.5.0` to align with related project versioning in Automation Bridge and MCP
  Server, making bridge contract alignment more visible.
- Increased default search limit from 10 to 50.
- Search text output now shows `remType` as compact prefix (`[doc]`, `[concept]`, `[desc]`, etc.) and `detail` as
  truncated suffix when available.
- Search results no longer include the `preview` field (removed upstream in the bridge plugin contract).
- Updated npm development scripts so `npm run dev` runs the CLI once (no file watching), and added
  `npm run dev:watch` for explicit watch-mode development.
- Updated documentation for the `dev` / `dev:watch` split and added a bridge limitation note that full REM + children
  reads are not yet available.

## [0.2.0] - 2026-02-18

### Added

- Daemon architecture: background process hosting WebSocket server (:3002) and HTTP control API (:3100).
- WebSocket server for RemNote Automation Bridge plugin connectivity (ported from remnote-mcp-server).
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
- Fixed CLI `status` bridge action name to `get_status` for compatibility with current RemNote Automation Bridge plugin.
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
