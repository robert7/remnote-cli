import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { PidInfo } from '../types/daemon.js';
import { PID_FILE } from '../config.js';

/**
 * Write daemon PID info to the PID file.
 */
export async function writePidFile(info: PidInfo): Promise<void> {
  await mkdir(dirname(PID_FILE), { recursive: true });
  await writeFile(PID_FILE, JSON.stringify(info, null, 2), 'utf-8');
}

/**
 * Read PID file. Returns null if file doesn't exist or is invalid.
 */
export async function readPidFile(): Promise<PidInfo | null> {
  try {
    const content = await readFile(PID_FILE, 'utf-8');
    return JSON.parse(content) as PidInfo;
  } catch {
    return null;
  }
}

/**
 * Remove the PID file.
 */
export async function removePidFile(): Promise<void> {
  try {
    await unlink(PID_FILE);
  } catch {
    // Ignore if already gone
  }
}

/**
 * Check if a process with the given PID is alive.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read PID file and check if the daemon process is actually running.
 * Returns PidInfo if running, null if not running or stale.
 */
export async function getRunningDaemon(): Promise<PidInfo | null> {
  const info = await readPidFile();
  if (!info) return null;

  if (!isProcessAlive(info.pid)) {
    // Stale PID file — clean it up
    await removePidFile();
    return null;
  }

  return info;
}
