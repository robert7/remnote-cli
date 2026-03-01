import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerReadCommand(program: Command): void {
  program
    .command('read <rem-id>')
    .description('Read a note by its Rem ID')
    .option('-d, --depth <n>', 'Depth of child hierarchy to render (default: 5)', '5')
    .option(
      '--include-content <mode>',
      'Content rendering mode: "markdown" (default), "none", or "structured"'
    )
    .option('--child-limit <n>', 'Maximum children per level (default: 100)')
    .option('--max-content-length <n>', 'Maximum content character length (default: 100000)')
    .action(async (remId: string, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const payload: Record<string, unknown> = {
          remId,
          depth: parseInt(opts.depth, 10),
        };
        if (opts.includeContent) payload.includeContent = opts.includeContent;
        if (opts.childLimit) payload.childLimit = parseInt(opts.childLimit, 10);
        if (opts.maxContentLength) payload.maxContentLength = parseInt(opts.maxContentLength, 10);

        const result = await client.execute('read_note', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as Record<string, unknown>;
            const lines: string[] = [];
            if (r.headline) {
              lines.push(`Title: ${r.headline}`);
            } else if (r.title) {
              lines.push(`Title: ${r.title}`);
            }
            if (r.remId) lines.push(`ID: ${r.remId}`);
            if (r.remType) lines.push(`Type: ${r.remType}`);
            if (typeof r.parentTitle === 'string' && r.parentTitle.length > 0) {
              const parentIdSuffix = typeof r.parentRemId === 'string' ? ` [${r.parentRemId}]` : '';
              lines.push(`Parent: ${r.parentTitle}${parentIdSuffix}`);
            }
            if (r.aliases && Array.isArray(r.aliases) && r.aliases.length > 0) {
              lines.push(`Aliases: ${(r.aliases as string[]).join(', ')}`);
            }
            if (r.cardDirection) lines.push(`Card: ${r.cardDirection}`);
            if (r.contentProperties) {
              const cp = r.contentProperties as Record<string, unknown>;
              lines.push(
                `Children: ${cp.childrenRendered}/${cp.childrenTotal}${cp.contentTruncated ? ' (truncated)' : ''}`
              );
            }
            if (r.content && typeof r.content === 'string' && r.content.length > 0) {
              lines.push('');
              lines.push(r.content as string);
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
