import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { checkVersionCompatibility } from '../version-compat.js';

const ACTION_TO_TOOL: Record<string, string> = {
  create_note: 'remnote_create_note',
  search: 'remnote_search',
  search_by_tag: 'remnote_search_by_tag',
  read_note: 'remnote_read_note',
  update_note: 'remnote_update_note',
  append_journal: 'remnote_append_journal',
  get_status: 'remnote_status',
  read_table: 'remnote_read_table',
};

type ToolContent = Array<{ type: string; text?: string }>;

/**
 * Short-lived MCP client used by CLI commands to call remnote-mcp-server.
 */
export class McpServerClient {
  private readonly mcpUrl: string;
  private readonly clientInfo: { name: string; version: string };
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(mcpUrl: string, clientInfo = { name: 'remnote-cli', version: '0.14.0' }) {
    this.mcpUrl = normalizeMcpUrl(mcpUrl);
    this.clientInfo = clientInfo;
  }

  async execute(action: string, payload: Record<string, unknown>): Promise<unknown> {
    const toolName = ACTION_TO_TOOL[action];
    if (!toolName) {
      throw new Error(`Unknown bridge action: ${action}`);
    }

    await this.connect();
    const result = await this.client!.callTool({ name: toolName, arguments: payload });

    if (result.isError) {
      throw new Error(this.extractText(result));
    }

    const parsed = this.parseResult(result);
    if (action === 'get_status' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const status = { ...parsed, cliVersion: this.clientInfo.version } as Record<string, unknown>;
      const serverVersion = status.serverVersion;

      if (typeof serverVersion === 'string') {
        const warning = checkVersionCompatibility(
          this.clientInfo.version,
          serverVersion,
          'CLI',
          'MCP server'
        );

        if (warning) {
          status.version_warning =
            typeof status.version_warning === 'string'
              ? `${status.version_warning}\n${warning}`
              : warning;
        }
      }

      return status;
    }

    return parsed;
  }

  async close(): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.terminateSession();
      }
    } catch {
      // Ignore shutdown errors; CLI commands are already done at this point.
    }

    try {
      if (this.client) {
        await this.client.close();
      }
    } catch {
      // Ignore shutdown errors; connection cleanup is best-effort.
    }

    this.client = null;
    this.transport = null;
  }

  private async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.transport = new StreamableHTTPClientTransport(new URL(this.mcpUrl));
    this.client = new Client(this.clientInfo);

    try {
      await this.client.connect(this.transport);
    } catch (error) {
      this.client = null;
      this.transport = null;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Cannot connect to MCP server at ${this.mcpUrl}. Is remnote-mcp-server running? ${message}`,
        { cause: error }
      );
    }
  }

  private extractText(result: Awaited<ReturnType<Client['callTool']>>): string {
    const content = result.content as ToolContent | undefined;
    const text = content?.find((item) => item.type === 'text' && item.text)?.text;
    return text ?? JSON.stringify(result);
  }

  private parseResult(result: Awaited<ReturnType<Client['callTool']>>): unknown {
    if (
      result.structuredContent &&
      typeof result.structuredContent === 'object' &&
      !Array.isArray(result.structuredContent)
    ) {
      return result.structuredContent;
    }

    const text = this.extractText(result);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { _raw: text };
    }
  }
}

function normalizeMcpUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.endsWith('/mcp')) {
    return trimmed;
  }
  return `${trimmed.replace(/\/+$/, '')}/mcp`;
}
