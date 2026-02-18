import { WebSocketServer } from '../websocket/websocket-server.js';
import { ControlServer } from './control-server.js';
import { writePidFile, removePidFile } from './pid.js';
import type { Logger } from '../logger.js';

export interface DaemonServerOptions {
  wsPort: number;
  controlPort: number;
  host: string;
  logger: Logger;
}

/**
 * Orchestrates the WebSocket server and HTTP control server.
 * This is the main daemon process entry point.
 */
export class DaemonServer {
  private wsServer: WebSocketServer;
  private controlServer: ControlServer;
  private options: DaemonServerOptions;
  private logger: Logger;

  constructor(options: DaemonServerOptions) {
    this.options = options;
    this.logger = options.logger.child({ context: 'daemon-server' });

    this.wsServer = new WebSocketServer(options.wsPort, options.host, options.logger);

    this.controlServer = new ControlServer(
      options.controlPort,
      options.host,
      this.wsServer,
      options.logger
    );

    this.controlServer.setHealthPorts(options.wsPort, options.controlPort);

    this.controlServer.onShutdown(() => {
      this.logger.info('Shutdown requested via control API');
      this.stop().catch((err) => {
        this.logger.error({ error: err }, 'Error during shutdown');
      });
    });
  }

  async start(): Promise<void> {
    this.logger.info(
      { wsPort: this.options.wsPort, controlPort: this.options.controlPort },
      'Starting daemon'
    );

    await this.wsServer.start();
    await this.controlServer.start();

    await writePidFile({
      pid: process.pid,
      wsPort: this.options.wsPort,
      controlPort: this.options.controlPort,
      startedAt: new Date().toISOString(),
    });

    this.wsServer.onClientConnect(() => {
      this.logger.info('RemNote bridge connected');
    });

    this.wsServer.onClientDisconnect(() => {
      this.logger.info('RemNote bridge disconnected');
    });

    this.logger.info('Daemon started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping daemon');
    await this.controlServer.stop();
    await this.wsServer.stop();
    await removePidFile();
    this.logger.info('Daemon stopped');
    process.exit(0);
  }
}
