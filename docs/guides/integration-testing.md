# Integration Testing

Integration tests run real CLI commands against a live daemon with a connected RemNote Bridge plugin. They create
real content in RemNote, prefixed with `[CLI-TEST]` for easy cleanup.

## Prerequisites

1. RemNote desktop app running
2. Bridge plugin installed and enabled in RemNote
3. Project built: `npm run build`

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

1. **Daemon Lifecycle** — start, status, stop (self-contained)
2. **Status Check** — bridge connection verification (gatekeeper)
3. **Create & Search** — create notes, search for them
4. **Read & Update** — read and modify created notes
5. **Journal** — append journal entries
6. **Error Cases** — invalid IDs, graceful error handling

If the status check (workflow 2) fails, workflows 3-6 are skipped.

## Cleanup

After running tests, search RemNote for `[CLI-TEST]` to find and delete test artifacts.
