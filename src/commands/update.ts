import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';
import { resolveUpdateContent } from './content-input.js';
import { validateNotFlag } from './arg-utils.js';

export function registerUpdateCommand(program: Command): void {
  const subprogram = program.command('update <rem-id>');
  const validate = (val: string) => validateNotFlag(val, subprogram);

  subprogram
    .description('Update an existing note')
    .option('--title <text>', 'New title', validate)
    .option('--append <text>', 'Append content', validate)
    .option('--append-file <path>', 'Read appended content from UTF-8 file ("-" for stdin)', validate)
    .option('--replace <text>', 'Replace direct child content (empty string clears all children)', validate)
    .option(
      '--replace-file <path>',
      'Read replacement content from UTF-8 file ("-" for stdin; empty file clears all children)',
      validate
    )
    .option('--add-tags <tags...>', 'Tags to add')
    .option('--remove-tags <tags...>', 'Tags to remove')
    .action(async (remId: string, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const { appendContent, replaceContent } = await resolveUpdateContent({
          appendText: opts.append as string | undefined,
          appendFile: opts.appendFile as string | undefined,
          replaceText: opts.replace as string | undefined,
          replaceFile: opts.replaceFile as string | undefined,
        });

        const payload: Record<string, unknown> = { remId };
        if (opts.title) payload.title = opts.title;
        if (appendContent !== undefined) payload.appendContent = appendContent;
        if (replaceContent !== undefined) payload.replaceContent = replaceContent;
        if (opts.addTags && opts.addTags.length > 0) payload.addTags = opts.addTags;
        if (opts.removeTags && opts.removeTags.length > 0) payload.removeTags = opts.removeTags;

        const result = await client.execute('update_note', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as { remIds?: string[]; titles?: string[] };
            const ids = r.remIds || [];
            const titles = r.titles || [];
            if (ids.length === 0) return `Updated note ${remId} (no Rems created)`;
            return titles
              .map((t, i) => `Updated/Created: ${t || '(untitled)'} (ID: ${ids[i] || 'unknown'})`)
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
