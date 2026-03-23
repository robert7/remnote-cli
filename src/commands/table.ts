import { Command } from 'commander';
import { DaemonClient } from '../client/daemon-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerReadTableCommand(program: Command): void {
  program
    .command('read-table <table-name-or-id>')
    .description('Read an Advanced Table (columns and row data)')
    .option('-l, --limit <n>', 'Maximum rows to return (default: 50)', '50')
    .option('--offset <n>', 'Row offset for pagination (default: 0)', '0')
    .option('-p, --properties <names>', 'Comma-separated property/column names to include')
    .action(async (tableNameOrId: string, opts) => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = new DaemonClient(parseInt(globalOpts.controlPort, 10));

      try {
        const payload: Record<string, unknown> = {
          tableNameOrId,
          limit: parseInt(opts.limit, 10),
          offset: parseInt(opts.offset, 10),
        };
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
