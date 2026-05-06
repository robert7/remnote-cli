import { Command } from 'commander';
import { createCommandClient } from '../client/command-client.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';
import { EXIT } from '../config.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Check bridge connection status')
    .action(async () => {
      const globalOpts = program.opts();
      const format: OutputFormat = globalOpts.text ? 'text' : 'json';
      const client = createCommandClient(program);

      try {
        const result = await client.execute('get_status', {});
        console.log(
          formatResult(result, format, (data) => {
            const r = data as Record<string, unknown>;
            const connected = r.connected ? 'Connected' : 'Not connected';
            const pluginVersion = r.pluginVersion ? ` (plugin v${r.pluginVersion})` : '';
            const cliVersion = r.cliVersion ? `CLI: v${r.cliVersion}` : '';
            const lines = [`Bridge: ${connected}${pluginVersion}`];
            if (cliVersion) lines.push(cliVersion);
            if (r.version_warning) lines.push(`WARNING: ${r.version_warning}`);
            return lines.join('\n');
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('Cannot connect to MCP server')) {
          console.error(formatError(message, format));
          process.exit(EXIT.MCP_SERVER_NOT_RUNNING);
        }
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      } finally {
        await client.close();
      }
    });
}
