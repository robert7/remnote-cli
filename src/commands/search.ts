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

function applySearchOptions(payload: Record<string, unknown>, opts: Record<string, unknown>): void {
  if (opts.includeContent) payload.includeContent = opts.includeContent;
  if (opts.depth) payload.depth = parseInt(opts.depth as string, 10);
  if (opts.childLimit) payload.childLimit = parseInt(opts.childLimit as string, 10);
  if (opts.maxContentLength)
    payload.maxContentLength = parseInt(opts.maxContentLength as string, 10);
}

function formatSearchText(data: unknown): string {
  const r = data as { results?: Array<Record<string, unknown>> };
  if (!r.results || r.results.length === 0) return 'No results found.';

  return r.results
    .map((note, i) => {
      const typeTag = TYPE_TAG[note.remType as string] ?? '';
      const headline = (note.headline as string) || (note.title as string) || '(untitled)';
      let aliasesSuffix = '';
      if (note.aliases && Array.isArray(note.aliases) && note.aliases.length > 0) {
        aliasesSuffix = ` (aka: ${(note.aliases as string[]).join(', ')})`;
      }
      let tagsSuffix = '';
      if (note.tags && Array.isArray(note.tags) && note.tags.length > 0) {
        tagsSuffix = ` [tags: ${(note.tags as string[]).join(', ')}]`;
      }
      let parentSuffix = '';
      if (typeof note.parentTitle === 'string' && note.parentTitle.length > 0) {
        const parentIdSuffix = typeof note.parentRemId === 'string' ? ` [${note.parentRemId}]` : '';
        parentSuffix = ` <- ${note.parentTitle}${parentIdSuffix}`;
      }
      return `${i + 1}. ${typeTag}${headline}${aliasesSuffix}${tagsSuffix}${parentSuffix} [${note.remId}]`;
    })
    .join('\n');
}

function registerCommonSearchOptions(command: Command): Command {
  return command
    .option(
      '-l, --limit <n>',
      `Maximum results (default: ${DEFAULT_SEARCH_LIMIT})`,
      String(DEFAULT_SEARCH_LIMIT)
    )
    .option(
      '--include-content <mode>',
      'Content rendering mode: "none" (default), "markdown", or "structured"'
    )
    .option('--depth <n>', 'Depth of child hierarchy to render (default: 1)')
    .option('--child-limit <n>', 'Maximum children per level (default: 20)')
    .option('--max-content-length <n>', 'Maximum content character length (default: 3000)');
}

export function registerSearchCommand(program: Command): void {
  registerCommonSearchOptions(
    program.command('search <query>').description('Search for notes in RemNote')
  ).action(async (query: string, opts) => {
    const globalOpts = program.opts();
    const format: OutputFormat = globalOpts.text ? 'text' : 'json';
    const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

    try {
      const payload: Record<string, unknown> = {
        query,
        limit: parseInt(opts.limit, 10),
      };
      applySearchOptions(payload, opts);

      const result = await client.execute('search', payload);
      console.log(formatResult(result, format, (data) => formatSearchText(data)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(formatError(message, format));
      process.exit(EXIT.ERROR);
    }
  });
}

export function registerSearchByTagCommand(program: Command): void {
  registerCommonSearchOptions(
    program
      .command('search-tag <tag>')
      .description('Search notes by tag with ancestor-context resolution')
  ).action(async (tag: string, opts) => {
    const globalOpts = program.opts();
    const format: OutputFormat = globalOpts.text ? 'text' : 'json';
    const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

    try {
      const payload: Record<string, unknown> = {
        tag,
        limit: parseInt(opts.limit, 10),
      };
      applySearchOptions(payload, opts);

      const result = await client.execute('search_by_tag', payload);
      console.log(formatResult(result, format, (data) => formatSearchText(data)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(formatError(message, format));
      process.exit(EXIT.ERROR);
    }
  });
}
