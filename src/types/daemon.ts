/**
 * Request from CLI command to daemon control API.
 */
export interface ControlRequest {
  action: string;
  payload: Record<string, unknown>;
}

/**
 * Response from daemon control API to CLI command.
 */
export interface ControlResponse {
  result?: unknown;
  error?: string;
  code?: number;
}

/**
 * Health check response from GET /health.
 */
export interface HealthResponse {
  status: 'running';
  pid: number;
  wsConnected: boolean;
  uptime: number;
  wsPort: number;
  controlPort: number;
}

/**
 * Contents of the PID file at ~/.remnote-cli/daemon.pid.
 */
export interface PidInfo {
  pid: number;
  wsPort: number;
  controlPort: number;
  startedAt: string;
}
