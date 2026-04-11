# remnote-cli

![License](https://img.shields.io/badge/license-MIT-blue)
![CI](https://github.com/robert7/remnote-cli/actions/workflows/ci.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/remnote-cli)](https://www.npmjs.com/package/remnote-cli)
[![codecov](https://codecov.io/gh/robert7/remnote-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/robert7/remnote-cli)

CLI (command-line interface) companion for the [RemNote Automation Bridge](https://github.com/robert7/remnote-mcp-bridge) plugin.
Provides terminal access to your RemNote knowledge base through a lightweight daemon architecture.
Useful e.g. for integration with OpenClaw agents, scripting and other automation, including hierarchical markdown note
creation and RemNote-native flashcards.

> If you run into any issues, please [report them here](https://github.com/robert7/remnote-cli/issues).

## Demo

See CLI flow and troubleshooting in action: **[View Demo →](docs/demo.md)**

## Architecture

```
RemNote + Automation Bridge Plugin (WebSocket client)
         │
         │ ws://127.0.0.1:3002
         ▼
CLI Daemon (background process)
  ├─ WebSocket Server :3002
  └─ HTTP Control API :3100
         ▲
         │ HTTP
CLI Commands (short-lived)
  e.g. remnote-cli create "My Note" --content-file /tmp/my-note.md
```

Two components: the RemNote Automation Bridge plugin connects to the CLI daemon's WebSocket server. CLI commands talk
to the daemon over a local HTTP control API.

On current bridge builds, the plugin starts its connection attempts automatically on plugin activation. The Automation
Bridge sidebar panel is optional for status, logs, and manual reconnect.

For the detailed bridge connection lifecycle, retry phases, and wake-up triggers, use the bridge repo as the source of
truth: [Connection Lifecycle Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/connection-lifecycle.md).

## Quick Start

> **Version compatibility (`0.x` semver):** install a `remnote-cli` version compatible with your installed RemNote Automation Bridge plugin version. See the [Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md).

```bash
npm install -g remnote-cli

# Start the daemon
remnote-cli daemon start

# Open RemNote and wait for the bridge to connect automatically
# Optional: open the Automation Bridge sidebar panel to verify status

# Check connection
remnote-cli status --text

# Create a note or flashcards from markdown content
remnote-cli create "My Note" --content-file /tmp/my-note.md --text

# Search
remnote-cli search "My Note" --text

# Stop the daemon
remnote-cli daemon stop
```

## Documentation

### Getting Started

- **[Installation Guide](docs/guides/installation.md)** - Prerequisites and install methods
- **[Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md)** - Match CLI version to installed bridge plugin version (`0.x` semver)
- **[Daemon Management](docs/guides/daemon-management.md)** - Start, stop, status, logs, and PID behavior
- **[Demo & Screenshots](docs/demo.md)** - Terminal walkthrough of daemon startup, connection checks, and search

### Usage

- **[Command Reference](docs/guides/command-reference.md)** - All CLI commands and examples

### Help & Advanced

- **[Troubleshooting](docs/guides/troubleshooting.md)** - Common issues and fixes
- **[Bridge Connection Lifecycle](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/connection-lifecycle.md)** - Canonical bridge connect/retry behavior

### Development

- **[Development Setup](docs/guides/development-setup.md)** - Local setup, workflows, and quality checks
- **[Integration Testing](docs/guides/integration-testing.md)** - End-to-end testing against live RemNote
- **[Shared Integration Test Workflow](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/integration-testing.md)** - Canonical guide for updating and running shared MCP server + CLI integration coverage

Pull requests that affect bridge-consumer behavior should follow the shared PR rules in the bridge repo: [Pull Request Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/pull-request-guide.md). In particular, keep bridge/server/CLI parity for shared functionality changes and link related PRs across the affected repos.

## Commands

| Command | Description |
|---------|-------------|
| `daemon start` | Start the background daemon |
| `daemon stop` | Stop the daemon |
| `daemon status` | Show daemon process status |
| `create [title] [options]` | Create notes or flashcards from inline or file-based markdown content |
| `search <query>` | Search for notes with metadata such as tags |
| `search-tag <tag>` | Search for tagged notes with ancestor context |
| `read <rem-id>` | Read a note by ID with tags and markdown or structured content |
| `read-table --title <title> \| --rem-id <id>` | Read Advanced Table rows, columns, and property metadata |
| `update <rem-id>` | Update an existing note with append/replace content operations |
| `journal [content]` | Append markdown content to today's journal |
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

- Node.js >= 20.19.0
- RemNote desktop app with the [RemNote Automation Bridge plugin](https://github.com/robert7/remnote-mcp-bridge) installed and enabled

## Troubleshooting

**Daemon won't start — port in use:**
Another process is using port 3002 or 3100. Use `--ws-port` or `--control-port` to pick different ports.

**"Bridge not connected" after daemon start:**
Open RemNote and give the bridge time to connect automatically. If you want to inspect status, open the Automation
Bridge sidebar panel. If RemNote was already open before the daemon started, the bridge should still reconnect in the
background; use **Reconnect** in the panel only if you want an immediate retry.

**Stale PID file:**
If the daemon crashed, `daemon start` will detect the stale PID file and clean it up automatically.

**Commands fail after plugin/CLI upgrade:**
Check bridge plugin version and `remnote-cli --version`, then install a compatible CLI version (prefer same minor line for `0.x`). See the [Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md).

## Related Projects

- [remnote-mcp-server](https://github.com/robert7/remnote-mcp-server) — MCP server integration path
- [remnote-mcp-bridge](https://github.com/robert7/remnote-mcp-bridge) — RemNote Automation Bridge plugin

## License

MIT
