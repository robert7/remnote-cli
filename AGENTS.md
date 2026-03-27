# AGENTS.md

This file is a map for AI agents working in `remnote-cli`.

## Repo Role

This repo is the CLI companion app for the RemNote bridge plugin. It uses a daemon model:

```text
CLI commands (short-lived) <-> HTTP control API (:3100) <-> daemon <-> WebSocket (:3002) <-> bridge plugin
```

JSON output is the default mode for automation consumers.

## Companion Repos (Sibling Dirs)

Resolve from this repo root (`$(pwd)`):

- `$(pwd)/../remnote-mcp-bridge` - authoritative bridge actions + payload/response contracts
- `$(pwd)/../remnote-mcp-server` - sibling consumer with shared contract and compatibility logic

When bridge contracts change, validate all three repos.

## Contract Map (Current)

### External CLI Command Surface

- Daemon lifecycle: `daemon start`, `daemon stop`, `daemon status`
- Bridge commands: `create`, `search`, `search-tag`, `read`, `update`, `journal`, `status`

### Bridge Mapping and Compatibility

- CLI bridge actions include `search_by_tag` and `get_status`.
- Bridge plugin sends WebSocket `hello` with plugin version.
- `status` output may include `cliVersion` and `version_warning`.
- Projects are `0.x`; prefer same minor line across bridge/server/CLI.
  - See `../remnote-mcp-bridge/docs/guides/bridge-consumer-version-compatibility.md`.

## Code Map

- `src/cli.ts` - top-level command wiring and global options
- `src/commands/*.ts` - command argument mapping and output handling
- `src/daemon/daemon-server.ts` - daemon runtime composition
- `src/daemon/control-server.ts` - control API (`/health`, `/execute`, `/shutdown`)
- `src/websocket/websocket-server.ts` - bridge WS server + request lifecycle
- `src/client/daemon-client.ts` - CLI-to-daemon HTTP client
- `src/version-compat.ts` - compatibility warning logic

Primary docs for deeper context:

- `docs/architecture.md`
- `docs/guides/command-reference.md`
- `docs/guides/daemon-management.md`
- `docs/guides/troubleshooting.md`

## Development and Verification

If Node/npm is unavailable in shell:

```bash
source ./node-check.sh
```

Core commands:

```bash
npm run dev
npm run dev:watch
npm run build
npm run typecheck
npm test
npm run test:coverage
./code-quality.sh
```

## Integration and Live Validation Policy

AI agents may run live integration tests in this repo only on explicit human request and only through the guarded
wrapper.

- Default: do not run `npm run test:integration` or `./run-integration-test.sh` directly.
- Allowed path for AI agents: `./run-agent-integration-test.sh [--yes]`
- Before invoking the wrapper, the agent must ask the human collaborator to start the bridge in RemNote.
- If bridge code changed after the currently running RemNote bridge session started, the agent must ask the human
  collaborator to restart the bridge before rerunning the suite.
- When switching from MCP server live integration tests to CLI live integration tests, the agent must ensure the MCP
  server is stopped before starting the CLI daemon.
- The wrapper may start the local CLI daemon if it is not already running, then waits for `daemon status` to report
  `wsConnected === true` before launching the suite.
- If the bridge never connects, the wrapper must stop and tell the human collaborator to verify the RemNote bridge
  session.
- Use unit/static checks for routine agent-side verification when explicit live validation is not requested.

## Documentation and Changelog Rules

- Before docs edits, read `.agents/dev-documentation.md`.
- Any functional or documentation change must be recorded in `CHANGELOG.md`.
- Keep AGENTS/docs map-level: contracts, rationale, and navigation.

## Release and Publishing Map

- Publish workflow: `./publish-to-npm.sh`
- Keep release notes aligned with `CHANGELOG.md`

## Git Policy

Do not create commits unless explicitly requested. Use `.agents/dev-workflow.md` as canonical policy.
