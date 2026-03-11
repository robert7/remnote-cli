import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';
import { resolveOptionalInlineOrFileContent } from './content-input.js';

export function registerCreateMdCommand(program: Command): void {
  program
    .command('create-md')
    .description('Create a hierarchical note tree in RemNote from a markdown string')
    .option('-c, --content <text>', 'Markdown content')
    .option('--content-file <path>', 'Read markdown content from UTF-8 file ("-" for stdin)')
    .option('--title <text>', 'Optional root Rem title to enclose the entire tree')
    .option('--parent-id <id>', 'Parent Rem ID')
    .option('-t, --tags <tags...>', 'Tags to add')
    .action(async (opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const content = await resolveOptionalInlineOrFileContent({
          inlineText: opts.content as string | undefined,
          filePath: opts.contentFile as string | undefined,
          inlineFlag: '--content',
          fileFlag: '--content-file',
        });

        if (content === undefined) {
          throw new Error('Markdown content is required via --content or --content-file');
        }

        const payload: Record<string, unknown> = { content };
        if (opts.title) payload.title = opts.title;
        if (opts.parentId) payload.parentId = opts.parentId;
        if (opts.tags) payload.tags = opts.tags;

        const result = await client.execute('create_note_md', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as Record<string, unknown>;
            const ids = Array.isArray(r.remIds) ? r.remIds.join(', ') : 'unknown';
            return `Created markdown tree: ${opts.title || '(root)'} (IDs: ${ids})`;
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });
}
