import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerJournalCommand(program: Command): void {
  program
    .command('journal <content>')
    .description("Append an entry to today's journal")
    .option('--no-timestamp', 'Omit timestamp prefix')
    .action(async (content: string, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const payload: Record<string, unknown> = {
          content,
          timestamp: opts.timestamp !== false,
        };

        const result = await client.execute('appendJournal', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as Record<string, unknown>;
            return `Journal entry added${r.remId ? ` (ID: ${r.remId})` : ''}`;
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });
}
