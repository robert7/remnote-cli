# Installation

## Prerequisites

- **Node.js 18+** — required for built-in `fetch()` support
- **RemNote** desktop app with the [RemNote Automation Bridge plugin](https://github.com/robert7/remnote-mcp-bridge) installed

## Install from npm

```bash
npm install -g remnote-cli
```

## Verify Installation

```bash
remnote-cli --version
```

## Build from Source

```bash
git clone https://github.com/robert7/remnote-cli.git
cd remnote-cli
npm install
npm run build
npm link  # makes 'remnote-cli' available globally
```
