import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerReadCommand(program: Command): void {
  program
    .command('read <rem-id>')
    .description('Read a note by its Rem ID')
    .option('-d, --depth <n>', 'Depth of children to include', '1')
    .action(async (remId: string, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const payload: Record<string, unknown> = {
          remId,
          depth: parseInt(opts.depth, 10),
        };

        const result = await client.execute('read_note', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as Record<string, unknown>;
            const lines: string[] = [];
            if (r.title) lines.push(`Title: ${r.title}`);
            if (r.remId) lines.push(`ID: ${r.remId}`);
            if (r.content) lines.push(`Content: ${r.content}`);
            if (r.tags && Array.isArray(r.tags) && r.tags.length > 0) {
              lines.push(`Tags: ${r.tags.join(', ')}`);
            }
            if (r.children && Array.isArray(r.children)) {
              lines.push(`Children: ${r.children.length}`);
            }
            return lines.join('\n');
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });
}
