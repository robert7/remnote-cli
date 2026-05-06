# remnote-cli

![License](https://img.shields.io/badge/license-MIT-blue)
![CI](https://github.com/robert7/remnote-cli/actions/workflows/ci.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/remnote-cli)](https://www.npmjs.com/package/remnote-cli)
[![codecov](https://codecov.io/gh/robert7/remnote-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/robert7/remnote-cli)

CLI client for the [RemNote MCP Server](https://github.com/robert7/remnote-mcp-server). It provides terminal access to
your RemNote knowledge base through the same MCP server used by AI clients, including note creation, search, reading,
updates, journal appends, and Advanced Table reads.

> If you run into any issues, please [report them here](https://github.com/robert7/remnote-cli/issues).

## Architecture

```text
remnote-cli and MCP clients
         │
         │ HTTP MCP http://127.0.0.1:3001/mcp
         ▼
RemNote MCP Server
         │
         │ WebSocket ws://127.0.0.1:3002
         ▼
RemNote Automation Bridge Plugin
         │
         ▼
RemNote SDK
```

There is one local server component: `remnote-mcp-server`. The CLI is a short-lived MCP client and does not run a daemon.

## Quick Start

> **Version compatibility (`0.x` semver):** install compatible versions of `remnote-cli`, `remnote-mcp-server`, and the
> RemNote Automation Bridge plugin. Prefer the same minor version line.

```bash
npm install -g remnote-mcp-server remnote-cli

# Start the one server component
remnote-mcp-server

# Open RemNote and wait for the bridge to connect automatically
remnote-cli status --text

remnote-cli create "My Note" --content-file /tmp/my-note.md --text
remnote-cli search "My Note" --text
```

Use a non-default MCP endpoint with either:

```bash
remnote-cli --mcp-url http://127.0.0.1:3005/mcp status
REMNOTE_MCP_URL=http://127.0.0.1:3005/mcp remnote-cli status
```

## Documentation

- **[Command Reference](docs/guides/command-reference.md)** - All CLI commands and examples
- **[Installation Guide](docs/guides/installation.md)** - Prerequisites and install methods
- **[Troubleshooting](docs/guides/troubleshooting.md)** - Common issues and fixes
- **[Development Setup](docs/guides/development-setup.md)** - Local setup, workflows, and quality checks
- **[Integration Testing](docs/guides/integration-testing.md)** - End-to-end testing against live RemNote
- **[Demo & Screenshots](docs/demo.md)** - Terminal walkthrough
- **[Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md)** - Compatibility policy

## Commands

| Command | Description |
|---------|-------------|
| `create [title] [options]` | Create notes or flashcards from inline or file-based markdown content |
| `search <query>` | Search for notes with parent-context metadata |
| `search-tag <tag>` | Search for tagged notes with ancestor context |
| `read <rem-id>` | Read a note by ID with markdown or structured content |
| `read-table --title <title> \| --rem-id <id>` | Read Advanced Table rows, columns, and property metadata |
| `update <rem-id>` | Update an existing note with append/replace content operations |
| `journal [content]` | Append markdown content to today's journal |
| `status` | Check bridge connection status through the MCP server |

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output (default) |
| `--text` | Human-readable output |
| `--mcp-url <url>` | MCP server URL (default: `http://127.0.0.1:3001/mcp`, env: `REMNOTE_MCP_URL`) |
| `--verbose` | Enable verbose stderr logging |
| `--version` | Show version |
| `--help` | Show help |

## Prerequisites

- Node.js >= 20.19.0
- `remnote-mcp-server` running locally or reachable by URL
- RemNote desktop/browser app with the [RemNote Automation Bridge plugin](https://github.com/robert7/remnote-mcp-bridge)
  installed and enabled

## Related Projects

- [remnote-mcp-server](https://github.com/robert7/remnote-mcp-server) - MCP server used by this CLI
- [remnote-mcp-bridge](https://github.com/robert7/remnote-mcp-bridge) - RemNote Automation Bridge plugin

## License

MIT
