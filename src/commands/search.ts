import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search for notes in RemNote')
    .option('-l, --limit <n>', 'Maximum results', '10')
    .option('--include-content', 'Include note content in results')
    .action(async (query: string, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const payload: Record<string, unknown> = {
          query,
          limit: parseInt(opts.limit, 10),
        };
        if (opts.includeContent) payload.includeContent = true;

        const result = await client.execute('search', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as { results?: Array<Record<string, unknown>> };
            if (!r.results || r.results.length === 0) return 'No results found.';
            return r.results
              .map(
                (note, i) =>
                  `${i + 1}. ${note.title || '(untitled)'}${note.remId ? ` [${note.remId}]` : ''}`
              )
              .join('\n');
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });
}
