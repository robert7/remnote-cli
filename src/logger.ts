import pino from 'pino';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export type { Logger } from 'pino';

export interface LoggerConfig {
  consoleLevel: string;
  fileLevel?: string;
  filePath?: string;
  pretty?: boolean;
}

/**
 * Create a Pino logger with the specified configuration.
 * Falls back to JSON output if pino-pretty is unavailable.
 */
export function createLogger(config: LoggerConfig): pino.Logger {
  const targets: pino.TransportTargetOptions[] = [];

  if (config.pretty) {
    targets.push({
      level: config.consoleLevel,
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    });
  } else {
    targets.push({
      level: config.consoleLevel,
      target: 'pino/file',
      options: { destination: 2 }, // stderr
    });
  }

  if (config.filePath && config.fileLevel) {
    targets.push({
      level: config.fileLevel,
      target: 'pino/file',
      options: { destination: config.filePath },
    });
  }

  try {
    return pino({
      level: getMinLevel(config.consoleLevel, config.fileLevel),
      transport: { targets },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (config.pretty) {
      console.error('[Logger] pino-pretty not available, falling back to JSON:', message);
    }

    const fallbackTargets: pino.TransportTargetOptions[] = [
      {
        level: config.consoleLevel,
        target: 'pino/file',
        options: { destination: 2 },
      },
    ];

    if (config.filePath && config.fileLevel) {
      fallbackTargets.push({
        level: config.fileLevel,
        target: 'pino/file',
        options: { destination: config.filePath },
      });
    }

    return pino({
      level: getMinLevel(config.consoleLevel, config.fileLevel),
      transport: { targets: fallbackTargets },
    });
  }
}

/**
 * Ensure directory exists for a log file path.
 */
export async function ensureLogDirectory(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
}

function getMinLevel(consoleLevel: string, fileLevel?: string): string {
  const levels: Record<string, number> = {
    silent: Infinity,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
  };

  const consoleLevelNum = levels[consoleLevel] ?? 30;
  const fileLevelNum = fileLevel ? (levels[fileLevel] ?? 30) : Infinity;
  const minLevelNum = Math.min(consoleLevelNum, fileLevelNum);

  for (const [name, num] of Object.entries(levels)) {
    if (num === minLevelNum) return name;
  }
  return 'info';
}
