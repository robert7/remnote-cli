import { createServer, IncomingMessage, ServerResponse, Server } from 'node:http';
import type { WebSocketServer } from '../websocket/websocket-server.js';
import type { Logger } from '../logger.js';
import type { ControlRequest, ControlResponse, HealthResponse } from '../types/daemon.js';

export class ControlServer {
  private server: Server | null = null;
  private port: number;
  private host: string;
  private wsServer: WebSocketServer;
  private logger: Logger;
  private startedAt: number;
  private shutdownCallback: (() => void) | null = null;

  constructor(port: number, host: string, wsServer: WebSocketServer, logger: Logger) {
    this.port = port;
    this.host = host;
    this.wsServer = wsServer;
    this.logger = logger.child({ context: 'control-server' });
    this.startedAt = Date.now();
  }

  /**
   * Register a callback to be called when shutdown is requested via POST /shutdown.
   */
  onShutdown(callback: () => void): void {
    this.shutdownCallback = callback;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (error) => {
        this.logger.error({ error }, 'Control server error');
        reject(error);
      });

      this.server.listen(this.port, this.host, () => {
        this.logger.debug({ port: this.port, host: this.host }, 'Control server started');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.debug('Control server stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const { method, url } = req;

    if (method === 'GET' && url === '/health') {
      this.handleHealth(res);
      return;
    }

    if (method === 'POST' && url === '/execute') {
      this.handleExecute(req, res);
      return;
    }

    if (method === 'POST' && url === '/shutdown') {
      this.handleShutdown(res);
      return;
    }

    this.sendJson(res, 404, { error: 'Not found' });
  }

  private handleHealth(res: ServerResponse): void {
    const health: HealthResponse = {
      status: 'running',
      pid: process.pid,
      wsConnected: this.wsServer.isConnected(),
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      wsPort: this.port, // Will be overridden by daemon-server
      controlPort: this.port,
    };
    this.sendJson(res, 200, health);
  }

  private handleExecute(req: IncomingMessage, res: ServerResponse): void {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { action, payload } = JSON.parse(body) as ControlRequest;
        if (!action) {
          this.sendJson(res, 400, { error: 'Missing action field' } as ControlResponse);
          return;
        }

        const result = await this.wsServer.sendRequest(action, payload || {});
        this.sendJson(res, 200, { result } as ControlResponse);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error({ error: message }, 'Execute failed');
        this.sendJson(res, 500, { error: message } as ControlResponse);
      }
    });
  }

  private handleShutdown(res: ServerResponse): void {
    this.sendJson(res, 200, { result: 'shutting down' } as ControlResponse);

    if (this.shutdownCallback) {
      // Defer to allow response to be sent
      setImmediate(() => this.shutdownCallback!());
    }
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Update the ports reported in /health (called by DaemonServer).
   */
  setHealthPorts(wsPort: number, controlPort: number): void {
    // Store ports for health endpoint — override the constructor port
    const originalHandleHealth = this.handleHealth.bind(this);
    this.handleHealth = (res: ServerResponse) => {
      const health: HealthResponse = {
        status: 'running',
        pid: process.pid,
        wsConnected: this.wsServer.isConnected(),
        uptime: Math.floor((Date.now() - this.startedAt) / 1000),
        wsPort,
        controlPort,
      };
      this.sendJson(res, 200, health);
    };
    // Avoid unused var lint
    void originalHandleHealth;
  }
}
