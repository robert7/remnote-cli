import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

/** Default number of search results. */
const DEFAULT_SEARCH_LIMIT = 50;

/** Compact type prefixes for text output (empty for plain text Rems). */
const TYPE_TAG: Record<string, string> = {
  document: '[doc] ',
  dailyDocument: '[daily] ',
  concept: '[concept] ',
  descriptor: '[desc] ',
  portal: '[portal] ',
};

/** Maximum length for detail suffix in text output. */
const DETAIL_TRUNCATE_LENGTH = 80;

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search for notes in RemNote')
    .option('-l, --limit <n>', `Maximum results (default: ${DEFAULT_SEARCH_LIMIT})`, String(DEFAULT_SEARCH_LIMIT))
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
              .map((note, i) => {
                const typeTag = TYPE_TAG[note.remType as string] ?? '';
                const title = (note.title as string) || '(untitled)';
                let detailSuffix = '';
                if (note.detail) {
                  const detail = note.detail as string;
                  detailSuffix =
                    detail.length > DETAIL_TRUNCATE_LENGTH
                      ? ` — ${detail.slice(0, DETAIL_TRUNCATE_LENGTH)}…`
                      : ` — ${detail}`;
                }
                return `${i + 1}. ${typeTag}${title}${detailSuffix} [${note.remId}]`;
              })
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
