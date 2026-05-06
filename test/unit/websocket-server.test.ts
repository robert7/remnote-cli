import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketServer } from '../../src/websocket/websocket-server.js';
import { REQUEST_TIMEOUT_MS } from '../../src/config.js';
import pino from 'pino';

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

function waitForMatchingMessage(
  ws: WebSocket,
  predicate: (message: Record<string, unknown>) => boolean
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const listener = (data: WebSocket.RawData) => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;
      if (!predicate(message)) {
        return;
      }

      ws.off('message', listener);
      resolve(message);
    };

    ws.on('message', listener);
  });
}

describe('WebSocketServer - Hello Message', () => {
  let server: WebSocketServer;
  let client: WebSocket | null = null;

  beforeEach(() => {
    server = new WebSocketServer(0, TEST_HOST, createSilentLogger(), '0.5.0');
  });

  afterEach(async () => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
      client = null;
    }
    await server.stop();
  });

  it('stores bridge version from hello message', async () => {
    await server.start();
    client = await connectClient(server.getPort());
    await new Promise((r) => setTimeout(r, 50));

    expect(server.getBridgeVersion()).toBeNull();

    client.send(JSON.stringify({ type: 'hello', version: '0.5.0' }));
    await new Promise((r) => setTimeout(r, 50));

    expect(server.getBridgeVersion()).toBe('0.5.0');
  });

  it('clears bridge version on disconnect', async () => {
    await server.start();
    client = await connectClient(server.getPort());
    await new Promise((r) => setTimeout(r, 50));

    client.send(JSON.stringify({ type: 'hello', version: '0.5.0' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(server.getBridgeVersion()).toBe('0.5.0');

    const disconnectPromise = new Promise<void>((resolve) => {
      server.onClientDisconnect(() => resolve());
    });
    client.close();
    client = null;
    await disconnectPromise;

    expect(server.getBridgeVersion()).toBeNull();
  });

  it('exposes CLI version', () => {
    expect(server.getCliVersion()).toBe('0.5.0');
  });

  it('announces CLI identity on connect', async () => {
    await server.start();
    const messagePromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      const nextClient = new WebSocket(`ws://${TEST_HOST}:${server.getPort()}`);
      nextClient.once('message', (data) => resolve(JSON.parse(data.toString())));
      nextClient.once('error', reject);
      client = nextClient;
    });

    const message = await messagePromise;
    expect(message).toEqual({
      type: 'companion_info',
      kind: 'cli',
      version: '0.5.0',
    });
  });
});

describe('WebSocketServer', () => {
  let server: WebSocketServer;
  let client: WebSocket | null = null;

  beforeEach(() => {
    server = new WebSocketServer(0, TEST_HOST, createSilentLogger());
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

    client = await connectClient(server.getPort());
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

    client = await connectClient(server.getPort());
    client.close();
    await disconnectPromise;

    expect(server.isConnected()).toBe(false);
    client = null;
  });

  it('rejects second client connection', async () => {
    await server.start();
    client = await connectClient(server.getPort());

    const second = await connectClient(server.getPort());
    const closePromise = new Promise<number>((resolve) => {
      second.on('close', (code) => resolve(code));
    });

    const code = await closePromise;
    expect(code).toBe(1008);
  });

  it('sends request and receives response', async () => {
    await server.start();
    client = await connectClient(server.getPort());

    // Wait a tick for connection to register
    await new Promise((r) => setTimeout(r, 50));

    const msgPromise = waitForMatchingMessage(client, (message) => {
      return typeof message.id === 'string' && typeof message.action === 'string';
    });
    const resultPromise = server.sendRequest('test_action', { key: 'value' });

    const msg = await msgPromise;
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
    await server.stop();
    server = new WebSocketServer(0, TEST_HOST, createSilentLogger());

    await server.start();
    client = await connectClient(server.getPort());
    await new Promise((r) => setTimeout(r, 50));

    vi.useFakeTimers();
    try {
      const resultPromise = server.sendRequest('slow_action', {});
      const expectation = expect(resultPromise).rejects.toThrow('timeout');

      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it('responds to ping with pong', async () => {
    await server.start();
    client = await connectClient(server.getPort());
    await new Promise((r) => setTimeout(r, 50));

    const pongPromise = waitForMatchingMessage(client, (message) => message.type === 'pong');
    client.send(JSON.stringify({ type: 'ping' }));

    const pong = await pongPromise;
    expect(pong.type).toBe('pong');
  });

  it('rejects pending requests on client disconnect', async () => {
    await server.start();
    client = await connectClient(server.getPort());
    await new Promise((r) => setTimeout(r, 50));

    // Send a request but don't respond — then disconnect
    const resultPromise = server.sendRequest('will_disconnect', {});
    client.close();
    client = null;

    await expect(resultPromise).rejects.toThrow('Connection lost');
  });

  it('handles bridge error response', async () => {
    await server.start();
    client = await connectClient(server.getPort());
    await new Promise((r) => setTimeout(r, 50));

    const msgPromise = waitForMatchingMessage(client, (message) => {
      return typeof message.id === 'string' && typeof message.action === 'string';
    });
    const resultPromise = server.sendRequest('fail_action', {});

    const msg = await msgPromise;

    client.send(JSON.stringify({ id: msg.id, error: 'Something went wrong' }));

    await expect(resultPromise).rejects.toThrow('Something went wrong');
  });
});
