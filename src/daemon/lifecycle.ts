import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getRunningDaemon, readPidFile, removePidFile, isProcessAlive } from './pid.js';
import { SHUTDOWN_TIMEOUT_MS, DEFAULT_HOST } from '../config.js';
import type { HealthResponse, PidInfo } from '../types/daemon.js';

/**
 * Start the daemon. If `foreground` is true, runs in the current process.
 * Otherwise, forks a detached child and verifies it starts via /health.
 */
export async function startDaemon(options: {
  wsPort: number;
  controlPort: number;
  foreground: boolean;
  logLevel: string;
  logFile?: string;
}): Promise<void> {
  // Check if already running
  const existing = await getRunningDaemon();
  if (existing) {
    throw new Error(
      `Daemon already running (PID ${existing.pid}, ws:${existing.wsPort}, control:${existing.controlPort})`
    );
  }

  if (options.foreground) {
    await runForeground(options);
  } else {
    await forkBackground(options);
  }
}

async function runForeground(options: {
  wsPort: number;
  controlPort: number;
  logLevel: string;
  logFile?: string;
}): Promise<void> {
  // Dynamic import to avoid loading daemon-server in short-lived CLI commands
  const { DaemonServer } = await import('./daemon-server.js');
  const { createLogger, ensureLogDirectory } = await import('../logger.js');

  if (options.logFile) {
    await ensureLogDirectory(options.logFile);
  }

  const logger = createLogger({
    consoleLevel: options.logLevel,
    fileLevel: options.logFile ? 'debug' : undefined,
    filePath: options.logFile,
    pretty: process.stderr.isTTY,
  });

  const server = new DaemonServer({
    wsPort: options.wsPort,
    controlPort: options.controlPort,
    host: DEFAULT_HOST,
    logger,
  });

  // Handle graceful shutdown signals
  const shutdown = () => {
    server.stop().catch(() => process.exit(1));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.start();
}

async function forkBackground(options: {
  wsPort: number;
  controlPort: number;
  logLevel: string;
  logFile?: string;
}): Promise<void> {
  // Resolve the path to our entry point
  const thisFile = fileURLToPath(import.meta.url);
  const distDir = dirname(dirname(thisFile));
  const entryPoint = join(distDir, 'index.js');

  const args = [
    'daemon',
    'start',
    '--foreground',
    '--ws-port',
    String(options.wsPort),
    '--control-port',
    String(options.controlPort),
    '--log-level',
    options.logLevel,
  ];

  if (options.logFile) {
    args.push('--log-file', options.logFile);
  }

  const child = spawn(process.execPath, [entryPoint, ...args], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });

  child.unref();

  // Wait for the daemon to become healthy
  const healthUrl = `http://${DEFAULT_HOST}:${options.controlPort}/health`;
  const maxAttempts = 30;
  const retryDelay = 200;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, retryDelay));
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        return; // Daemon is up
      }
    } catch {
      // Not ready yet
    }
  }

  throw new Error(
    `Daemon failed to start within ${(maxAttempts * retryDelay) / 1000}s. ` +
      `Check logs at ${options.logFile || 'stderr'}.`
  );
}

/**
 * Stop the daemon by requesting shutdown, then falling back to SIGTERM.
 */
export async function stopDaemon(): Promise<void> {
  const info = await readPidFile();
  if (!info) {
    throw new DaemonNotRunningError();
  }

  if (!isProcessAlive(info.pid)) {
    await removePidFile();
    throw new DaemonNotRunningError();
  }

  // Try graceful shutdown via control API
  const shutdownUrl = `http://${DEFAULT_HOST}:${info.controlPort}/shutdown`;
  try {
    await fetch(shutdownUrl, { method: 'POST' });
  } catch {
    // Control server might already be down
  }

  // Wait for process to exit
  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isProcessAlive(info.pid)) {
      await removePidFile();
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  // Force kill if still alive
  try {
    process.kill(info.pid, 'SIGTERM');
  } catch {
    // Already dead
  }

  // Wait a bit more after SIGTERM
  await new Promise((r) => setTimeout(r, 500));
  await removePidFile();
}

/**
 * Get daemon status. Returns health info if running, null if not.
 */
export async function getDaemonStatus(): Promise<{
  pidInfo: PidInfo;
  health: HealthResponse;
} | null> {
  const info = await getRunningDaemon();
  if (!info) return null;

  try {
    const healthUrl = `http://${DEFAULT_HOST}:${info.controlPort}/health`;
    const res = await fetch(healthUrl);
    if (!res.ok) return null;
    const health = (await res.json()) as HealthResponse;
    return { pidInfo: info, health };
  } catch {
    return null;
  }
}

export class DaemonNotRunningError extends Error {
  constructor() {
    super('Daemon is not running');
    this.name = 'DaemonNotRunningError';
  }
}
