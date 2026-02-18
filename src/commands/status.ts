import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Check bridge connection status')
    .action(async () => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const result = await client.execute('getStatus', {});
        console.log(
          formatResult(result, format, (data) => {
            const r = data as Record<string, unknown>;
            const connected = r.connected ? 'Connected' : 'Not connected';
            const version = r.pluginVersion ? ` (plugin v${r.pluginVersion})` : '';
            return `Bridge: ${connected}${version}`;
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('Cannot connect to daemon')) {
          console.error(formatError(message, format));
          process.exit(EXIT.DAEMON_NOT_RUNNING);
        }
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });
}
