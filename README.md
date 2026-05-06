# remnote-cli is legacy

The `remnote-cli` command has moved into the maintained
[remnote-mcp-server](https://github.com/robert7/remnote-mcp-server) package.

Uninstall the old standalone package:

```bash
npm uninstall -g remnote-cli
```

Install the maintained package:

```bash
npm install -g remnote-mcp-server
```

The `remnote-mcp-server` package now provides both commands:

```bash
remnote-mcp-server
remnote-cli
```

Maintained docs:

- [Server and CLI demo](https://github.com/robert7/remnote-mcp-server/blob/main/docs/demo.md)
- [CLI command reference](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/cli-command-reference.md)
- [Installation guide](https://github.com/robert7/remnote-mcp-server/blob/main/docs/guides/installation.md)

This repository is kept only so existing links and issue history remain understandable.
