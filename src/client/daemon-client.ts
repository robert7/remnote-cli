import type { ControlResponse, HealthResponse } from '../types/daemon.js';
import { DEFAULT_HOST } from '../config.js';

/**
 * HTTP client for CLI→daemon communication.
 * Uses Node 18+ built-in fetch().
 */
export class DaemonClient {
  private baseUrl: string;

  constructor(controlPort: number, host: string = DEFAULT_HOST) {
    this.baseUrl = `http://${host}:${controlPort}`;
  }

  /**
   * Execute a bridge action via the daemon.
   */
  async execute(action: string, payload: Record<string, unknown>): Promise<unknown> {
    const res = await this.fetchJson('/execute', {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    });

    const body = res.body as ControlResponse;
    if (body.error) {
      throw new Error(body.error);
    }
    return body.result;
  }

  /**
   * Get daemon health status.
   */
  async health(): Promise<HealthResponse> {
    const res = await this.fetchJson('/health');
    return res.body as HealthResponse;
  }

  /**
   * Request daemon shutdown.
   */
  async shutdown(): Promise<void> {
    await this.fetchJson('/shutdown', { method: 'POST' });
  }

  private async fetchJson(
    path: string,
    options?: RequestInit
  ): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
    } catch (error) {
      throw new Error(
        `Cannot connect to daemon at ${this.baseUrl}. Is the daemon running? (remnote-cli daemon start)`
      );
    }
    const body = await res.json();
    return { status: res.status, body };
  }
}
