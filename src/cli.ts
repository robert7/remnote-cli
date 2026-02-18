import { Command } from 'commander';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export const HELLO_MESSAGE = 'Hello from remnote-cli. WebSocket integration is coming next.';

export function createProgram(version: string): Command {
  const program = new Command();

  program
    .name('remnote-cli')
    .description('CLI companion for RemNote Bridge via WebSocket')
    .version(version)
    .action(() => {
      console.log(HELLO_MESSAGE);
    });

  return program;
}

export function runCli(argv = process.argv): void {
  const program = createProgram(packageJson.version);
  program.parse(argv);
}
