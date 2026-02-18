import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_WS_PORT = 3002;
export const DEFAULT_CONTROL_PORT = 3100;
export const DEFAULT_HOST = '127.0.0.1';

const PID_DIR = join(homedir(), '.remnote-cli');
export const PID_FILE = join(PID_DIR, 'daemon.pid');
export const LOG_FILE = join(PID_DIR, 'daemon.log');
export const DATA_DIR = PID_DIR;

export const REQUEST_TIMEOUT_MS = 5000;
export const SHUTDOWN_TIMEOUT_MS = 3000;

/** Exit codes for CLI process */
export const EXIT = {
  SUCCESS: 0,
  ERROR: 1,
  DAEMON_NOT_RUNNING: 2,
  BRIDGE_NOT_CONNECTED: 3,
} as const;
