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
2. **Create & Search** — create notes, search for them
3. **Read & Update** — read and modify created notes
4. **Journal** — append journal entries
5. **Error Cases** — invalid IDs, graceful error handling

If the status check (workflow 1) fails, workflows 2-5 are skipped.

## Cleanup

After running tests, search RemNote for `[CLI-TEST]` to find and delete test artifacts.
