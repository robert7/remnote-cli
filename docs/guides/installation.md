# Installation

## Prerequisites

- **Node.js 20.19.0+**
- **remnote-mcp-server** installed and running locally or reachable by URL
- **RemNote** desktop app with the [RemNote Automation Bridge plugin](https://github.com/robert7/remnote-mcp-bridge) installed

## Install from npm

> **Version compatibility (`0.x` semver):** before installing/upgrading, check the [Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md) and pick a `remnote-cli` version compatible with your installed bridge plugin version.

```bash
npm install -g remnote-mcp-server remnote-cli

# Example pinned install when you need a specific compatible version
npm install -g remnote-mcp-server@0.5.0
npm install -g remnote-cli@0.5.0
```

## Verify Installation

```bash
remnote-cli --version
remnote-mcp-server --version
```

## Build from Source

> Prefer a checkout/tag that matches your installed bridge plugin minor version. See the [Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md).

```bash
git clone https://github.com/robert7/remnote-cli.git
cd remnote-cli
npm install
npm run build
npm link  # makes 'remnote-cli' available globally
```
