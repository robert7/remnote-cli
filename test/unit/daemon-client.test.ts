import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import { DaemonClient } from '../../src/client/daemon-client.js';

const TEST_PORT = 13200;
const TEST_HOST = '127.0.0.1';

describe('DaemonClient', () => {
  let mockServer: Server;
  let client: DaemonClient;
  let requestHandler: (req: IncomingMessage, res: ServerResponse) => void;

  beforeEach(async () => {
    requestHandler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    };

    mockServer = createServer((req, res) => requestHandler(req, res));
    await new Promise<void>((resolve) => {
      mockServer.listen(TEST_PORT, TEST_HOST, resolve);
    });

    client = new DaemonClient(TEST_PORT, TEST_HOST);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      mockServer.close(() => resolve());
    });
  });

  describe('execute', () => {
    it('sends action and payload, returns result', async () => {
      requestHandler = (req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          const parsed = JSON.parse(body);
          expect(parsed.action).toBe('createNote');
          expect(parsed.payload).toEqual({ title: 'Test' });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: { remId: 'abc123' } }));
        });
      };

      const result = await client.execute('createNote', { title: 'Test' });
      expect(result).toEqual({ remId: 'abc123' });
    });

    it('throws on error response', async () => {
      requestHandler = (_req, res) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bridge not connected' }));
      };

      await expect(client.execute('test', {})).rejects.toThrow('Bridge not connected');
    });
  });

  describe('health', () => {
    it('returns health response', async () => {
      requestHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'running',
            pid: 12345,
            wsConnected: true,
            uptime: 60,
            wsPort: 3002,
            controlPort: 3100,
          })
        );
      };

      const health = await client.health();
      expect(health.status).toBe('running');
      expect(health.pid).toBe(12345);
      expect(health.wsConnected).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('sends POST to /shutdown', async () => {
      const shutdownCalled = vi.fn();
      requestHandler = (req, res) => {
        if (req.url === '/shutdown' && req.method === 'POST') {
          shutdownCalled();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: 'shutting down' }));
        }
      };

      await client.shutdown();
      expect(shutdownCalled).toHaveBeenCalled();
    });
  });

  describe('connection error', () => {
    it('throws descriptive error when daemon is not running', async () => {
      const deadClient = new DaemonClient(19999, TEST_HOST);
      await expect(deadClient.health()).rejects.toThrow('Cannot connect to daemon');
    });
  });
});
