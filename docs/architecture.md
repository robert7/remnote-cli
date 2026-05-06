# Architecture

`remnote-cli` is a short-lived MCP client. MCP, the Model Context Protocol, is the tool-call protocol exposed by
`remnote-mcp-server` over HTTP.

```text
remnote-cli
  -> HTTP MCP endpoint http://127.0.0.1:3001/mcp
  -> remnote-mcp-server
  -> WebSocket ws://127.0.0.1:3002
  -> RemNote Automation Bridge plugin
  -> RemNote SDK
```

## Why No CLI Daemon?

The RemNote bridge plugin can connect to only one local WebSocket server at a time. Keeping a separate CLI daemon meant
the CLI and MCP server competed for port `3002`, duplicated integration tests, and forced shared bridge-contract changes
to be implemented twice.

The CLI now reuses `remnote-mcp-server` as the only server component. This gives local scripts and MCP clients the same
bridge connection, compatibility checks, and RemNote action surface.

## CLI Process Model

Each command starts, opens an MCP session against `--mcp-url`, calls one MCP tool, formats the result, then exits.
Default JSON output is preserved for automation. Use `--text` when reading output directly.

## Configuration

The default MCP URL is `http://127.0.0.1:3001/mcp`.

Override it with:

```bash
remnote-cli --mcp-url http://127.0.0.1:3005/mcp status
REMNOTE_MCP_URL=http://127.0.0.1:3005/mcp remnote-cli status
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General command or tool error |
| 2 | MCP server not reachable |
| 3 | Reserved for bridge-not-connected flows |
