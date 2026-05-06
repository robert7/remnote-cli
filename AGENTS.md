# AGENTS.md

This file is a map for AI agents working in `remnote-cli`.

## Repo Role

This repo is the command-line client for the RemNote MCP stack:

```text
CLI commands (short-lived) <-> MCP HTTP (:3001/mcp) <-> remnote-mcp-server <-> WebSocket (:3002) <-> bridge plugin
```

JSON output is the default mode for automation consumers. The CLI no longer runs a daemon; `remnote-mcp-server` is the
single server component.

## Companion Repos (Sibling Dirs)

Resolve from this repo root (`$(pwd)`):

- `$(pwd)/../remnote-mcp-bridge` - authoritative bridge actions + payload/response contracts
- `$(pwd)/../remnote-mcp-server` - MCP server and bridge WebSocket host used by the CLI

When bridge contracts change, validate all three repos.

## Contract Map (Current)

### External CLI Command Surface

- Bridge commands: `create`, `search`, `search-tag`, `read`, `update`, `journal`, `status`, `read-table`
- Global MCP endpoint option: `--mcp-url <url>` (default: `http://127.0.0.1:3001/mcp`, env: `REMNOTE_MCP_URL`)

### Bridge Mapping and Compatibility

- CLI command payloads map to MCP tools exposed by `remnote-mcp-server`.
- MCP tools map to bridge actions such as `create_note`, `search`, `search_by_tag`, `read_note`, `update_note`,
  `append_journal`, `get_status`, and `read_table`.
- Projects are `0.x`; prefer same minor line across bridge/server/CLI.
  - See `../remnote-mcp-bridge/docs/guides/bridge-consumer-version-compatibility.md`.

## Code Map

- `src/cli.ts` - top-level command wiring and global options
- `src/commands/*.ts` - command argument mapping and output handling
- `src/client/mcp-server-client.ts` - CLI-to-MCP Streamable HTTP client
- `src/client/command-client.ts` - command helper for constructing MCP clients
- `src/output/formatter.ts` - JSON/text formatting

Primary docs for deeper context:

- `docs/architecture.md`
- `docs/guides/command-reference.md`
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
- Before invoking the wrapper, ask the human collaborator to start the bridge in RemNote.
- If bridge code changed after the currently running RemNote bridge session started, ask the human collaborator to
  restart the bridge before rerunning the suite.
- The wrapper may start `../remnote-mcp-server` if it is not already reachable, then waits for `remnote-cli status` to
  report a connected bridge before launching the suite.
- After each agent-assisted integration run, whether it passes, fails, or is interrupted, the wrapper must stop the MCP
  server if and only if the wrapper started it for that run.
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
