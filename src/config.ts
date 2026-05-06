export const DEFAULT_MCP_URL = 'http://127.0.0.1:3001/mcp';

export const REQUEST_TIMEOUT_MS = 15000;

/** Exit codes for CLI process */
export const EXIT = {
  SUCCESS: 0,
  ERROR: 1,
  MCP_SERVER_NOT_RUNNING: 2,
  BRIDGE_NOT_CONNECTED: 3,
} as const;
