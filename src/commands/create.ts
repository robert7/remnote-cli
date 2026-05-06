import { Command } from 'commander';
import { createCommandClient } from '../client/command-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';
import { resolveOptionalInlineOrFileContent } from './content-input.js';
import { checkPayloadForFlags, validateNotFlag } from './arg-utils.js';

export function registerCreateCommand(program: Command): void {
  const subprogram = program.command('create [title]');
  const validate = (val: string) => validateNotFlag(val, subprogram);

  subprogram
    .description('Create a new note in RemNote (title or content required)')
    .option('--title <text>', 'Note title', validate)
    .option('-c, --content <text>', 'Note content (markdown/flashcard supported)', validate)
    .option('--content-file <path>', 'Read note content from UTF-8 file ("-" for stdin)', validate)
    .option('--parent-id <id>', 'Parent Rem ID', validate)
    .option('-t, --tags <tags...>', 'Tags to add')
    .action(async (titleArg: string | undefined, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = createCommandClient(program);

      try {
        const payload: Record<string, unknown> = {};
        // Validate shifting flags for positional arguments
        checkPayloadForFlags({ title: titleArg }, subprogram);
        const title = titleArg !== undefined ? titleArg : (opts.title as string | undefined);

        if (title !== undefined) payload.title = title;

        const content = await resolveOptionalInlineOrFileContent({
          inlineText: opts.content as string | undefined,
          filePath: opts.contentFile as string | undefined,
          inlineFlag: '--content',
          fileFlag: '--content-file',
        });

        if (content !== undefined) payload.content = content;
        if (opts.parentId) payload.parentId = opts.parentId;
        if (opts.tags && opts.tags.length > 0) payload.tags = opts.tags;

        const result = await client.execute('create_note', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as { remIds?: string[]; titles?: string[] };
            const ids = r.remIds || [];
            const titles = r.titles || [];
            if (ids.length === 0) return 'No Rems created.';
            return titles
              .map((t, i) => `Created: ${t || '(untitled)'} (ID: ${ids[i] || 'unknown'})`)
              .join('\n');
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      } finally {
        await client.close();
      }
    });
}
