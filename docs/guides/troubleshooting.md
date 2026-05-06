# Troubleshooting

## MCP Server Not Reachable

**Symptom:** `remnote-cli status` exits with code `2` or says it cannot connect to the MCP server.

**Fix:**

1. Start `remnote-mcp-server`.
2. Check that the MCP URL matches the server:
   ```bash
   remnote-cli --mcp-url http://127.0.0.1:3001/mcp status --text
   ```
3. If you changed the MCP server HTTP port, use `--mcp-url` or `REMNOTE_MCP_URL`.
4. Check port `3001` if the server still does not respond.

## Bridge Not Connecting

**Symptom:** `remnote-cli status` works but reports `connected: false`.

**Checklist:**

1. Is RemNote running?
2. Is the RemNote Automation Bridge plugin installed and enabled in RemNote?
3. Is `remnote-mcp-server` running with its WebSocket server on `ws://127.0.0.1:3002`?
4. Re-check bridge status with `remnote-cli status --text`.
5. Give the bridge up to 30 seconds to reconnect automatically after RemNote or the MCP server starts.
6. Open the Automation Bridge panel in the right sidebar if you want to inspect status or wake the bridge sooner.
7. If the `MCP` icon is missing from the right sidebar toolbar, verify the plugin is installed and enabled.

For detailed bridge retry phases and wake-up behavior, see the canonical bridge doc:
[Connection Lifecycle Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/connection-lifecycle.md).

## Version Mismatch After Upgrade

**Symptom:** `status` may show connected, but commands fail after upgrading bridge, server, or CLI.

**Fix:**

1. Check bridge plugin version from `remnote-cli status`.
2. Check CLI version: `remnote-cli --version`.
3. Check server version: `remnote-mcp-server --version`.
4. Install compatible versions across bridge/server/CLI, preferring the same `0.x` minor line.
5. Restart `remnote-mcp-server`, then re-run `remnote-cli status --text`.

See the [Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md).

## Command Timeouts

**Symptom:** Commands hang for 15+ seconds then fail with a request timeout.

**Cause:** The MCP server forwarded the request to the bridge, but the bridge did not respond in time. This can happen
if RemNote is busy or the plugin encountered an error. Check the RemNote developer console and the MCP server logs.

## Argument Shifting / Flag Swallowing

**Symptom:** Command fails with `looks like a flag but was passed as an option value` or `Argument shifting detected`.

**Cause:** The shell misinterpreted your command, likely because an empty string or a missing value caused the next flag
to be consumed as the value for the current option.

Example of problematic syntax:

```bash
remnote-cli create --title --content "Note body"
```

**Fix:** Ensure every option that expects a value has one. Use explicit equality syntax to force empty values:

```bash
remnote-cli create --title="" --content "Note body"
```
