import { Command } from 'commander';
import { createRequire } from 'node:module';
import { DEFAULT_MCP_URL } from './config.js';
import { registerCreateCommand } from './commands/create.js';
import { registerSearchByTagCommand, registerSearchCommand } from './commands/search.js';
import { registerReadCommand } from './commands/read.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerJournalCommand } from './commands/journal.js';
import { registerStatusCommand } from './commands/status.js';
import { registerReadTableCommand } from './commands/table.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export function createProgram(version: string): Command {
  const program = new Command();

  program
    .name('remnote-cli')
    .description('CLI client for RemNote MCP Server')
    .version(version)
    .option('--json', 'JSON output (default)')
    .option('--text', 'Human-readable output')
    .option(
      '--mcp-url <url>',
      'RemNote MCP server URL',
      process.env.REMNOTE_MCP_URL || DEFAULT_MCP_URL
    )
    .option('--verbose', 'Enable verbose stderr logging');

  registerCreateCommand(program);
  registerSearchCommand(program);
  registerSearchByTagCommand(program);
  registerReadCommand(program);
  registerUpdateCommand(program);
  registerJournalCommand(program);
  registerStatusCommand(program);
  registerReadTableCommand(program);

  return program;
}

export function runCli(argv = process.argv): void {
  const program = createProgram(packageJson.version);
  program.parse(argv);
}
