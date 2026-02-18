import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketServer } from '../../src/websocket/websocket-server.js';
import pino from 'pino';

const TEST_PORT = 13002;
const TEST_HOST = '127.0.0.1';

function createSilentLogger() {
  return pino({ level: 'silent' });
}

function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${TEST_HOST}:${port}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    ws.once('message', (data) => resolve(data.toString()));
  });
}

describe('WebSocketServer', () => {
  let server: WebSocketServer;
  let client: WebSocket | null = null;

  beforeEach(() => {
    server = new WebSocketServer(TEST_PORT, TEST_HOST, createSilentLogger());
  });

  afterEach(async () => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
      client = null;
    }
    await server.stop();
  });

  it('starts and stops without error', async () => {
    await server.start();
    await server.stop();
  });

  it('accepts a client connection', async () => {
    await server.start();
    const connectPromise = new Promise<void>((resolve) => {
      server.onClientConnect(() => resolve());
    });

    client = await connectClient(TEST_PORT);
    await connectPromise;

    expect(server.isConnected()).toBe(true);
  });

  it('reports not connected when no client', async () => {
    await server.start();
    expect(server.isConnected()).toBe(false);
  });

  it('fires disconnect callback when client closes', async () => {
    await server.start();
    const disconnectPromise = new Promise<void>((resolve) => {
      server.onClientDisconnect(() => resolve());
    });

    client = await connectClient(TEST_PORT);
    client.close();
    await disconnectPromise;

    expect(server.isConnected()).toBe(false);
    client = null;
  });

  it('rejects second client connection', async () => {
    await server.start();
    client = await connectClient(TEST_PORT);

    const second = await connectClient(TEST_PORT);
    const closePromise = new Promise<number>((resolve) => {
      second.on('close', (code) => resolve(code));
    });

    const code = await closePromise;
    expect(code).toBe(1008);
  });

  it('sends request and receives response', async () => {
    await server.start();
    client = await connectClient(TEST_PORT);

    // Wait a tick for connection to register
    await new Promise((r) => setTimeout(r, 50));

    const msgPromise = waitForMessage(client);
    const resultPromise = server.sendRequest('test_action', { key: 'value' });

    const rawMsg = await msgPromise;
    const msg = JSON.parse(rawMsg);
    expect(msg.action).toBe('test_action');
    expect(msg.payload).toEqual({ key: 'value' });
    expect(msg.id).toBeDefined();

    // Send response back
    client.send(JSON.stringify({ id: msg.id, result: { success: true } }));

    const result = await resultPromise;
    expect(result).toEqual({ success: true });
  });

  it('rejects request when no client connected', async () => {
    await server.start();
    await expect(server.sendRequest('test', {})).rejects.toThrow('not connected');
  });

  it('handles request timeout', async () => {
    // Use a server with very short timeout to avoid fake timer issues
    await server.stop();
    server = new WebSocketServer(TEST_PORT, TEST_HOST, createSilentLogger());

    // Temporarily patch REQUEST_TIMEOUT_MS by testing behavior directly
    await server.start();
    client = await connectClient(TEST_PORT);
    await new Promise((r) => setTimeout(r, 50));

    // Send request but don't respond — will timeout after REQUEST_TIMEOUT_MS (5s)
    const resultPromise = server.sendRequest('slow_action', {});

    await expect(resultPromise).rejects.toThrow('timeout');
  }, 10000);

  it('responds to ping with pong', async () => {
    await server.start();
    client = await connectClient(TEST_PORT);
    await new Promise((r) => setTimeout(r, 50));

    const pongPromise = waitForMessage(client);
    client.send(JSON.stringify({ type: 'ping' }));

    const rawPong = await pongPromise;
    const pong = JSON.parse(rawPong);
    expect(pong.type).toBe('pong');
  });

  it('rejects pending requests on client disconnect', async () => {
    await server.start();
    client = await connectClient(TEST_PORT);
    await new Promise((r) => setTimeout(r, 50));

    // Send a request but don't respond — then disconnect
    const resultPromise = server.sendRequest('will_disconnect', {});
    client.close();
    client = null;

    await expect(resultPromise).rejects.toThrow('Connection lost');
  });

  it('handles bridge error response', async () => {
    await server.start();
    client = await connectClient(TEST_PORT);
    await new Promise((r) => setTimeout(r, 50));

    const msgPromise = waitForMessage(client);
    const resultPromise = server.sendRequest('fail_action', {});

    const rawMsg = await msgPromise;
    const msg = JSON.parse(rawMsg);

    client.send(JSON.stringify({ id: msg.id, error: 'Something went wrong' }));

    await expect(resultPromise).rejects.toThrow('Something went wrong');
  });
});
