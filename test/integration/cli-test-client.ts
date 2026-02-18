import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(thisDir, '..', '..');
const cliBin = join(projectRoot, 'dist', 'index.js');

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  json: unknown;
}

/**
 * Spawns CLI commands and captures output.
 * All commands use --json by default for machine-parseable output.
 */
export class CliTestClient {
  private controlPort: number;

  constructor(controlPort: number) {
    this.controlPort = controlPort;
  }

  /**
   * Run a CLI command and return the result.
   */
  async run(args: string[], timeoutMs = 10000): Promise<CliResult> {
    const fullArgs = [cliBin, '--json', '--control-port', String(this.controlPort), ...args];

    return new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, fullArgs, {
        cwd: projectRoot,
        env: { ...process.env },
        timeout: timeoutMs,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));

      proc.on('close', (code) => {
        let json: unknown = null;
        try {
          json = JSON.parse(stdout.trim());
        } catch {
          // Not JSON output
        }
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
          json,
        });
      });

      proc.on('error', reject);
    });
  }

  /**
   * Run a CLI command and expect JSON output. Throws if exit code != 0.
   */
  async runExpectSuccess(args: string[]): Promise<unknown> {
    const result = await this.run(args);
    if (result.exitCode !== 0) {
      throw new Error(`CLI exited with code ${result.exitCode}: ${result.stderr || result.stdout}`);
    }
    if (result.json === null) {
      throw new Error(`Expected JSON output, got: ${result.stdout}`);
    }
    return result.json;
  }

  /**
   * Run a CLI command and expect failure (non-zero exit code).
   */
  async runExpectError(args: string[]): Promise<CliResult> {
    const result = await this.run(args);
    if (result.exitCode === 0) {
      throw new Error(`Expected non-zero exit code, got 0. Output: ${result.stdout}`);
    }
    return result;
  }
}
