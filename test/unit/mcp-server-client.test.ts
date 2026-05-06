import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServerClient } from '../../src/client/mcp-server-client.js';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  callTool: vi.fn(),
  close: vi.fn(),
  terminateSession: vi.fn(),
  transportUrl: '',
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(function MockClient() {
    this.connect = mocks.connect;
    this.callTool = mocks.callTool;
    this.close = mocks.close;
  }),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi
    .fn()
    .mockImplementation(function MockStreamableHTTPClientTransport(url: URL) {
      mocks.transportUrl = url.toString();
      this.terminateSession = mocks.terminateSession;
    }),
}));

describe('McpServerClient', () => {
  beforeEach(() => {
    mocks.connect.mockReset().mockResolvedValue(undefined);
    mocks.callTool.mockReset();
    mocks.close.mockReset().mockResolvedValue(undefined);
    mocks.terminateSession.mockReset().mockResolvedValue(undefined);
    mocks.transportUrl = '';
  });

  it('maps bridge actions to MCP tools and returns structured content', async () => {
    mocks.callTool.mockResolvedValue({
      structuredContent: { remId: 'abc123' },
      content: [{ type: 'text', text: '{"remId":"abc123"}' }],
    });

    const client = new McpServerClient('http://127.0.0.1:3001');
    const result = await client.execute('create_note', { title: 'Test' });

    expect(mocks.transportUrl).toBe('http://127.0.0.1:3001/mcp');
    expect(mocks.callTool).toHaveBeenCalledWith({
      name: 'remnote_create_note',
      arguments: { title: 'Test' },
    });
    expect(result).toEqual({ remId: 'abc123' });
  });

  it('parses JSON text content when structured content is absent', async () => {
    mocks.callTool.mockResolvedValue({
      content: [{ type: 'text', text: '{"connected":true,"serverVersion":"0.14.0"}' }],
    });

    const client = new McpServerClient('http://127.0.0.1:3001/mcp');
    await expect(client.execute('get_status', {})).resolves.toEqual({
      connected: true,
      serverVersion: '0.14.0',
      cliVersion: '0.14.0',
    });
  });

  it('adds a status warning when CLI and MCP server versions mismatch', async () => {
    mocks.callTool.mockResolvedValue({
      structuredContent: { connected: true, serverVersion: '0.15.0' },
      content: [{ type: 'text', text: '{"connected":true,"serverVersion":"0.15.0"}' }],
    });

    const client = new McpServerClient('http://127.0.0.1:3001/mcp');
    await expect(client.execute('get_status', {})).resolves.toMatchObject({
      connected: true,
      serverVersion: '0.15.0',
      cliVersion: '0.14.0',
      version_warning: expect.stringContaining('MCP server v0.15.0'),
    });
  });

  it('throws MCP tool error text', async () => {
    mocks.callTool.mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: 'Bridge not connected' }],
    });

    const client = new McpServerClient('http://127.0.0.1:3001/mcp');
    await expect(client.execute('search', { query: 'x' })).rejects.toThrow('Bridge not connected');
  });

  it('wraps connection failures with MCP server context', async () => {
    mocks.connect.mockRejectedValue(new Error('fetch failed'));

    const client = new McpServerClient('http://127.0.0.1:3001/mcp');
    await expect(client.execute('search', { query: 'x' })).rejects.toThrow(
      'Cannot connect to MCP server at http://127.0.0.1:3001/mcp'
    );
  });

  it('rejects unknown bridge actions before connecting', async () => {
    const client = new McpServerClient('http://127.0.0.1:3001/mcp');

    await expect(client.execute('unknown_action', {})).rejects.toThrow(
      'Unknown bridge action: unknown_action'
    );
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('closes the MCP session and client best-effort', async () => {
    mocks.callTool.mockResolvedValue({
      structuredContent: { ok: true },
      content: [{ type: 'text', text: '{"ok":true}' }],
    });

    const client = new McpServerClient('http://127.0.0.1:3001/mcp');
    await client.execute('search', { query: 'x' });
    await client.close();

    expect(mocks.terminateSession).toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalled();
  });
});
