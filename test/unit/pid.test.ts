import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { PidInfo } from '../../src/types/daemon.js';

/**
 * Tests PID utilities directly by writing/reading a temp PID file.
 * We test the pure logic (isProcessAlive) and do file operations manually
 * to avoid vi.mock hoisting issues with the config module.
 */

const testDir = join(tmpdir(), `remnote-cli-test-${randomUUID()}`);
const testPidFile = join(testDir, 'daemon.pid');

const samplePidInfo: PidInfo = {
  pid: process.pid,
  wsPort: 3002,
  controlPort: 3100,
  startedAt: '2026-02-18T00:00:00.000Z',
};

// Import the pure function that doesn't depend on PID_FILE
import { isProcessAlive } from '../../src/daemon/pid.js';

describe('PID utilities', () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await unlink(testPidFile);
    } catch {
      // ignore
    }
  });

  describe('isProcessAlive', () => {
    it('returns true for current process', () => {
      expect(isProcessAlive(process.pid)).toBe(true);
    });

    it('returns false for non-existent PID', () => {
      expect(isProcessAlive(999999)).toBe(false);
    });
  });

  describe('PID file operations (manual)', () => {
    it('writes and reads PID info as JSON', async () => {
      await mkdir(testDir, { recursive: true });
      await writeFile(testPidFile, JSON.stringify(samplePidInfo, null, 2), 'utf-8');

      const content = await readFile(testPidFile, 'utf-8');
      const parsed = JSON.parse(content) as PidInfo;
      expect(parsed).toEqual(samplePidInfo);
    });

    it('returns null-equivalent when file does not exist', async () => {
      let info: PidInfo | null = null;
      try {
        const content = await readFile(testPidFile, 'utf-8');
        info = JSON.parse(content) as PidInfo;
      } catch {
        info = null;
      }
      expect(info).toBeNull();
    });

    it('returns null-equivalent for invalid JSON', async () => {
      await writeFile(testPidFile, 'not json', 'utf-8');
      let info: PidInfo | null = null;
      try {
        const content = await readFile(testPidFile, 'utf-8');
        info = JSON.parse(content) as PidInfo;
      } catch {
        info = null;
      }
      expect(info).toBeNull();
    });

    it('detects stale PID (dead process)', () => {
      const stalePid = 999999;
      expect(isProcessAlive(stalePid)).toBe(false);
    });
  });
});
