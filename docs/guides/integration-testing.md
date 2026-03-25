# Integration Testing

Integration tests run real CLI commands against a live daemon with a connected RemNote Automation Bridge plugin. They create
real content in RemNote, prefixed with `[CLI-TEST]` for easy cleanup.

## Prerequisites

1. RemNote desktop app running
2. RemNote Automation Bridge plugin installed and enabled in RemNote
3. CLI daemon already running (for example: `./run-daemon-in-foreground.sh`)
4. Project built: `npm run build`

## Running Tests

```bash
# Interactive (prompts for confirmation)
./run-integration-test.sh

# Skip confirmation
./run-integration-test.sh --yes
```

Or directly:

```bash
npm run build
npm run test:integration
npm run test:integration -- --yes
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLI_CONTROL_PORT` | `3100` | Daemon control port |
| `CLI_TEST_DELAY` | `2000` | Delay (ms) after create before search |

## Test Workflows

1. **Status Check** — bridge connection verification (gatekeeper)
2. **Create & Search** — create notes, validate `search` and `search-tag` across all `includeContent` modes
3. **Read & Update** — read and modify created notes
4. **Journal** — append journal entries
5. **Error Cases** — invalid IDs, graceful error handling

If the status check (workflow 1) fails, workflows 2-5 are skipped.

## Cleanup

After running tests, search RemNote for `[CLI-TEST]` to find and delete test artifacts.

Integration-created notes are grouped under the shared root-level anchor note
`RemNote Automation Bridge [temporary integration test data]`.

Anchor resolution is deterministic:
1. multi-query `search` lookup + exact title match (trim/whitespace normalized),
2. fallback `search-tag` lookup using the dedicated anchor tag `remnote-integration-root-anchor`,
3. create anchor note only if both lookups fail.

When reusing a title-only hit, integration setup backfills the anchor tag for future deterministic lookup.

Uniqueness is enforced: if more than one exact anchor-title match exists, the integration run fails immediately and
prints duplicate `remId`s so you can clean up test data in RemNote.

---

## Testing read-table

The read-table integration test (workflow 07) requires an Advanced Table in RemNote to be pre-configured. This allows
testing the table reading functionality without needing write operations.

### Setup

1. Create an Advanced Table in RemNote with some data (at least one column and one row)
2. Find the table's name exactly as it appears in RemNote
3. Create or edit the config file at:

   **Windows:** `C:\Users\<your-username>\.remnote-mcp-bridge\remnote-mcp-bridge.json`

   **macOS/Linux:** `~/.remnote-mcp-bridge/remnote-mcp-bridge.json`

4. Add the integration test configuration:

```json
{
  "integrationTest": {
    "tableName": "Your Table Name"
  }
}
```

### Running

After setting up the config, run the integration tests as usual:

```bash
npm run test:integration
```

The read-table workflow will be skipped with a warning if the config is missing or invalid.
