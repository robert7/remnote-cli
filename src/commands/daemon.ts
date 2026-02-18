import { Command } from 'commander';
import {
  startDaemon,
  stopDaemon,
  getDaemonStatus,
  DaemonNotRunningError,
} from '../daemon/lifecycle.js';
import { DEFAULT_WS_PORT, DEFAULT_CONTROL_PORT, LOG_FILE, EXIT } from '../config.js';
import { formatResult, formatError, type OutputFormat } from '../output/formatter.js';

export function registerDaemonCommand(program: Command): void {
  const daemon = program.command('daemon').description('Manage the daemon process');

  daemon
    .command('start')
    .description('Start the daemon')
    .option('--ws-port <port>', 'WebSocket server port', String(DEFAULT_WS_PORT))
    .option('--control-port <port>', 'Control API port', String(DEFAULT_CONTROL_PORT))
    .option('-f, --foreground', "Run in foreground (don't detach)", false)
    .option('--log-level <level>', 'Log level (silent, debug, info, warn, error)', 'silent')
    .option('--log-file <path>', 'Log file path')
    .action(async (opts) => {
      const format: OutputFormat = program.opts().text ? 'text' : 'json';
      try {
        const logFile = opts.logFile || (opts.foreground ? undefined : LOG_FILE);
        const logLevel = opts.foreground && opts.logLevel === 'silent' ? 'info' : opts.logLevel;

        await startDaemon({
          wsPort: parseInt(opts.wsPort, 10),
          controlPort: parseInt(opts.controlPort, 10),
          foreground: opts.foreground,
          logLevel,
          logFile,
        });

        if (!opts.foreground) {
          console.log(
            formatResult(
              {
                message: 'Daemon started',
                wsPort: parseInt(opts.wsPort, 10),
                controlPort: parseInt(opts.controlPort, 10),
              },
              format,
              () => `Daemon started (ws:${opts.wsPort}, control:${opts.controlPort})`
            )
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });

  daemon
    .command('stop')
    .description('Stop the daemon')
    .action(async () => {
      const format: OutputFormat = program.opts().text ? 'text' : 'json';
      try {
        await stopDaemon();
        console.log(formatResult({ message: 'Daemon stopped' }, format, () => 'Daemon stopped'));
      } catch (error) {
        if (error instanceof DaemonNotRunningError) {
          console.error(formatError('Daemon is not running', format));
          process.exit(EXIT.DAEMON_NOT_RUNNING);
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });

  daemon
    .command('status')
    .description('Show daemon status')
    .action(async () => {
      const format: OutputFormat = program.opts().text ? 'text' : 'json';
      try {
        const status = await getDaemonStatus();
        if (!status) {
          console.log(formatResult({ status: 'stopped' }, format, () => 'Daemon is not running'));
          process.exit(EXIT.DAEMON_NOT_RUNNING);
        }

        console.log(
          formatResult(status.health, format, (data) => {
            const h = data as typeof status.health;
            return [
              `Status: ${h.status}`,
              `PID: ${h.pid}`,
              `Uptime: ${h.uptime}s`,
              `WebSocket port: ${h.wsPort}`,
              `Control port: ${h.controlPort}`,
              `Bridge connected: ${h.wsConnected}`,
            ].join('\n');
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatError(message, format));
        process.exit(EXIT.ERROR);
      }
    });
}
