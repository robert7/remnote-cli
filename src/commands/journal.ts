import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';
import { resolveJournalContent } from './content-input.js';
import { checkPayloadForFlags, validateNotFlag } from './arg-utils.js';

export function registerJournalCommand(program: Command): void {
  const subprogram = program.command('journal [content]');
  const validate = (val: string) => validateNotFlag(val, subprogram);

  subprogram
    .description("Append an entry to today's journal")
    .option('--content <text>', 'Journal entry content', validate)
    .option('--content-file <path>', 'Read journal entry from UTF-8 file ("-" for stdin)', validate)
    .option('--no-timestamp', 'Omit timestamp prefix')
    .action(async (positionalContent: string | undefined, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        // Validate shifting for positional content
        checkPayloadForFlags({ content: positionalContent }, program);

        const content = await resolveJournalContent({
          positionalContent: positionalContent as string | undefined,
          optionContent: opts.content as string | undefined,
          contentFile: opts.contentFile as string | undefined,
        });

        const payload: Record<string, unknown> = {
          content,
          timestamp: opts.timestamp !== false,
        };

        const result = await client.execute('append_journal', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as { remIds?: string[]; titles?: string[] };
            const ids = r.remIds || [];
            const titles = r.titles || [];
            if (ids.length === 0) return 'No journal entry Rems created.';
            return titles
              .map((t, i) => `Journal entry added: ${t || '(untitled)'} (ID: ${ids[i] || 'unknown'})`)
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
