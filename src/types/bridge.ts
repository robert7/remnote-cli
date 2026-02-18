/**
 * Request sent TO RemNote plugin via WebSocket.
 */
export interface BridgeRequest {
  id: string;
  action: string;
  payload: Record<string, unknown>;
}

/**
 * Response received FROM RemNote plugin via WebSocket.
 */
export interface BridgeResponse {
  id: string;
  result?: unknown;
  error?: string;
}

/**
 * Heartbeat messages for connection health.
 */
export interface HeartbeatPing {
  type: 'ping';
}

export interface HeartbeatPong {
  type: 'pong';
}

export type BridgeMessage = BridgeRequest | BridgeResponse | HeartbeatPing | HeartbeatPong;
