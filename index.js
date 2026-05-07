#!/usr/bin/env node

const message = `remnote-cli has moved.

0.13.1 was the last independent remnote-cli package version.
Starting with 0.14.0, remnote-cli is provided by remnote-mcp-server.

Please migrate:

  npm uninstall -g remnote-cli
  npm install -g remnote-mcp-server

Then use:

  remnote-mcp-server
  remnote-cli

This standalone package is discontinued.`;

console.error(message);
process.exit(1);
