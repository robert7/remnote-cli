# Integration Testing

Integration tests run real CLI commands against a live `remnote-mcp-server` with a connected RemNote Automation Bridge
plugin. They create real content in RemNote, prefixed with `[CLI-TEST]` for easy cleanup.

## Prerequisites

1. RemNote desktop/browser app running
2. RemNote Automation Bridge plugin installed and enabled in RemNote
3. `remnote-mcp-server` reachable at `REMNOTE_MCP_URL` or startable from `../remnote-mcp-server`
4. Project built: `npm run build`

## Running Tests

```bash
# Interactive (prompts for confirmation)
./run-integration-test.sh

# Skip confirmation
./run-integration-test.sh --yes

# Agent-assisted: starts/reuses the MCP server, waits for bridge connection, then runs the suite
./run-agent-integration-test.sh
./run-agent-integration-test.sh --yes
```

For agent-assisted runs, the human collaborator must still start or confirm the RemNote bridge session. If bridge code
changed since the current RemNote bridge session started, ask for a bridge restart before rerunning the suite.

## Environment Variables

| Variable          | Default                       | Description                           |
| ----------------- | ----------------------------- | ------------------------------------- |
| `REMNOTE_MCP_URL` | `http://127.0.0.1:3001/mcp`   | MCP server URL                        |
| `CLI_TEST_DELAY`  | `2000`                        | Delay (ms) after create before search |

## Test Workflows

1. **Status Check** - bridge connection verification
2. **Create & Search** - create notes, validate `search` and `search-tag` across all `includeContent` modes
3. **Read & Update** - read and modify created notes
4. **Journal** - append journal entries
5. **Error Cases** - invalid IDs, graceful error handling
6. **Read Table** - read a pre-configured Advanced Table by name and Rem ID, then validate filtering,
   pagination, and not-found behavior

If the status check fails, remaining workflows are skipped.

## Cleanup

After running tests, search RemNote for `[CLI-TEST]` to find and delete test artifacts. Integration-created notes are
grouped under the shared root-level anchor note `RemNote Automation Bridge [temporary integration test data]`.

## Testing read-table

The read-table workflow requires an Advanced Table in RemNote to be pre-configured. Create or edit:

**Windows:** `C:\Users\<your-username>\.remnote-mcp-bridge\remnote-mcp-bridge.json`

**macOS/Linux:** `~/.remnote-mcp-bridge/remnote-mcp-bridge.json`

```json
{
  "integrationTest": {
    "tableName": "Your Table Name",
    "tableRemId": "abc123def"
  }
}
```

The read-table workflow is skipped when either field is missing or the config is invalid.
