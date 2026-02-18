import { Command } from 'commander';
import { createRequire } from 'node:module';
import { DEFAULT_CONTROL_PORT } from './config.js';
import { registerDaemonCommand } from './commands/daemon.js';
import { registerCreateCommand } from './commands/create.js';
import { registerSearchCommand } from './commands/search.js';
import { registerReadCommand } from './commands/read.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerJournalCommand } from './commands/journal.js';
import { registerStatusCommand } from './commands/status.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export function createProgram(version: string): Command {
  const program = new Command();

  program
    .name('remnote-cli')
    .description('CLI companion for RemNote Bridge via WebSocket')
    .version(version)
    .option('--json', 'JSON output (default)')
    .option('--text', 'Human-readable output')
    .option('--control-port <port>', 'Override daemon control port', String(DEFAULT_CONTROL_PORT))
    .option('--verbose', 'Enable verbose stderr logging');

  registerDaemonCommand(program);
  registerCreateCommand(program);
  registerSearchCommand(program);
  registerReadCommand(program);
  registerUpdateCommand(program);
  registerJournalCommand(program);
  registerStatusCommand(program);

  return program;
}

export function runCli(argv = process.argv): void {
  const program = createProgram(packageJson.version);
  program.parse(argv);
}
