import type { Command } from 'commander';
import { createRequire } from 'node:module';
import { McpServerClient } from './mcp-server-client.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

export function createCommandClient(program: Command): McpServerClient {
  const opts = program.opts<{ mcpUrl: string }>();
  return new McpServerClient(opts.mcpUrl, { name: 'remnote-cli', version: packageJson.version });
}
