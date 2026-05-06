# remnote-cli has moved

This repository is **legacy and discontinued**, but the `remnote-cli` command is still available and maintained.

The CLI source code, documentation, tests, and npm executable now live in the
[remnote-mcp-server](https://github.com/robert7/remnote-mcp-server) repository. The `remnote-mcp-server` npm package
provides both commands:

```bash
remnote-mcp-server
remnote-cli
```

In other words: this repository stopped being the home of the CLI, not the CLI itself.

## What to install

Uninstall the old standalone package:

```bash
npm uninstall -g remnote-cli
```

Install the maintained package:

```bash
npm install -g remnote-mcp-server
```

Verify both executables are available:

```bash
remnote-mcp-server --version
remnote-cli --version
```

## Where to go now

Use the maintained server repository for current code, issues, docs, and development:

- [remnote-mcp-server repository](https://github.com/robert7/remnote-mcp-server)
- [Server and CLI demo](https://github.com/robert7/remnote-mcp-server/blob/main/docs/demo.md)
- [CLI command reference](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/cli-command-reference.md)
- [Installation guide](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/installation.md)

## Why this changed

`remnote-cli` now talks directly to the MCP HTTP endpoint exposed by `remnote-mcp-server`. Maintaining a separate CLI
repository and npm package created unnecessary version drift, so the CLI was folded into the server package.

This repository is kept only so existing links, release history, and issue references remain understandable.
