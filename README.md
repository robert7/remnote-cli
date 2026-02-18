# remnote-cli

CLI companion for the RemNote Bridge plugin. Provides terminal access to your RemNote knowledge base through a
lightweight daemon architecture.

> This is a working **proof-of-concept/experimental solution**. You're invited to test
> it and [report any bugs or issues](https://github.com/robert7/remnote-cli/issues).

## Architecture

```
RemNote + Bridge Plugin (WebSocket client)
         │
         │ ws://127.0.0.1:3002
         ▼
CLI Daemon (background process)
  ├─ WebSocket Server :3002
  └─ HTTP Control API :3100
         ▲
         │ HTTP
CLI Commands (short-lived)
  e.g. remnote-cli create "My Note"
```

Two components: the Bridge plugin connects to the CLI daemon's WebSocket server. CLI commands talk to the daemon
over a local HTTP control API.

## Quick Start

```bash
npm install -g remnote-cli

# Start the daemon
remnote-cli daemon start

# Check connection (requires RemNote + Bridge plugin running)
remnote-cli status --text

# Create a note
remnote-cli create "My Note" --content "Hello from the CLI" --text

# Search
remnote-cli search "My Note" --text

# Stop the daemon
remnote-cli daemon stop
```

## Documentation

### Getting Started

- **[Installation Guide](docs/guides/installation.md)** - Prerequisites and install methods
- **[Daemon Management](docs/guides/daemon-management.md)** - Start, stop, status, logs, and PID behavior

### Usage

- **[Command Reference](docs/guides/command-reference.md)** - All CLI commands and examples

### Help & Advanced

- **[Troubleshooting](docs/guides/troubleshooting.md)** - Common issues and fixes

### Development

- **[Development Setup](docs/guides/development-setup.md)** - Local setup, workflows, and quality checks
- **[Integration Testing](docs/guides/integration-testing.md)** - End-to-end testing against live RemNote

## Commands

| Command | Description |
|---------|-------------|
| `daemon start` | Start the background daemon |
| `daemon stop` | Stop the daemon |
| `daemon status` | Show daemon process status |
| `create <title>` | Create a new note |
| `search <query>` | Search for notes |
| `read <rem-id>` | Read a note by ID |
| `update <rem-id>` | Update an existing note |
| `journal <content>` | Append to today's journal |
| `status` | Check bridge connection status |

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output (default) |
| `--text` | Human-readable output |
| `--control-port <port>` | Override control port (default: 3100) |
| `--verbose` | Enable verbose stderr logging |
| `--version` | Show version |
| `--help` | Show help |

## Configuration

| Setting | Default | Environment |
|---------|---------|-------------|
| WebSocket port | 3002 | `--ws-port` flag on `daemon start` |
| Control port | 3100 | `--control-port` global flag |
| PID file | `~/.remnote-cli/daemon.pid` | — |
| Log file | `~/.remnote-cli/daemon.log` | `--log-file` flag on `daemon start` |

## Prerequisites

- Node.js >= 18
- RemNote desktop app with the [Bridge plugin](https://github.com/robert7/remnote-bridge) installed and enabled

## Troubleshooting

**Daemon won't start — port in use:**
Another process is using port 3002 or 3100. Use `--ws-port` or `--control-port` to pick different ports.

**"Bridge not connected" after daemon start:**
The RemNote Bridge plugin needs to be running in RemNote. Open RemNote and ensure the plugin is enabled.

**Stale PID file:**
If the daemon crashed, `daemon start` will detect the stale PID file and clean it up automatically.

## Related Projects

- [remnote-mcp-server](https://github.com/robert7/remnote-mcp-server) — MCP server integration path
- [remnote-mcp-bridge](https://github.com/robert7/remnote-mcp-bridge) — RemNote Bridge plugin

## License

MIT
