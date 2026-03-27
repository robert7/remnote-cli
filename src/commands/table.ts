import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerReadTableCommand(program: Command): void {
  program
    .command('read-table')
    .description('Read an Advanced Table (columns and row data)')
    .option('--title <title>', 'Exact Advanced Table title')
    .option('--rem-id <id>', 'Table Rem ID')
    .option('-l, --limit <n>', 'Maximum rows to return (default: 50)', '50')
    .option('--offset <n>', 'Row offset for pagination (default: 0)', '0')
    .option('-p, --properties <names>', 'Comma-separated property/column names to include')
    .action(async (opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const payload: Record<string, unknown> = {
          limit: parseInt(opts.limit, 10),
          offset: parseInt(opts.offset, 10),
        };
        if ((opts.title ? 1 : 0) + (opts.remId ? 1 : 0) !== 1) {
          throw new Error('Provide exactly one of --title or --rem-id');
        }
        if (opts.title) payload.tableTitle = opts.title as string;
        if (opts.remId) payload.tableRemId = opts.remId as string;
        if (opts.properties) {
          payload.propertyFilter = (opts.properties as string)
            .split(',')
            .map((s: string) => s.trim());
        }

        const result = await client.execute('read_table', payload);
        console.log(
          formatResult(result, format, (data) => {
            const r = data as Record<string, unknown>;
            const lines: string[] = [];

            // Table header
            const tableName = r.tableName || '(unnamed)';
            lines.push(`Table: ${tableName} [${r.tableId}]`);

            // Columns
            const columns = (r.columns || []) as Array<Record<string, string>>;
            if (columns.length > 0) {
              lines.push(`Columns: ${columns.map((c) => `${c.name} (${c.type})`).join(', ')}`);
            }

            // Row count
            lines.push(`Rows: ${r.rowsReturned}/${r.totalRows}`);

            // Rows
            const rows = (r.rows || []) as Array<Record<string, unknown>>;
            if (rows.length > 0 && columns.length > 0) {
              lines.push('');
              // Header row
              const colNames = ['Name', ...columns.map((c) => c.name)];
              lines.push(colNames.join(' | '));
              lines.push(colNames.map((n) => '─'.repeat(n.length)).join('─┼─'));
              // Data rows
              for (const row of rows) {
                const values = (row.values || {}) as Record<string, string>;
                const cells = [
                  String(row.name || ''),
                  ...columns.map((c) => values[c.propertyId] || ''),
                ];
                lines.push(cells.join(' | '));
              }
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
