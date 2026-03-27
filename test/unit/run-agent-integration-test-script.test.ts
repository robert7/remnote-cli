import { describe, expect, it } from 'vitest';
import { mkdtempSync, chmodSync, cpSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function setupCliWrapperSandbox(runExitCode: number) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'remnote-cli-agent-wrapper-'));
  const binDir = join(tempRoot, 'bin');
  mkdirSync(binDir, { recursive: true });

  const scriptPath = join(tempRoot, 'run-agent-integration-test.sh');
  const integrationScriptPath = join(tempRoot, 'run-integration-test.sh');
  const nodeCheckPath = join(tempRoot, 'node-check.sh');
  const commandLogPath = join(tempRoot, 'commands.log');
  const statusCountPath = join(tempRoot, 'status-count');

  cpSync(resolve(process.cwd(), 'run-agent-integration-test.sh'), scriptPath);
  chmodSync(scriptPath, 0o755);

  writeFileSync(nodeCheckPath, '#!/usr/bin/env bash\nreturn 0\n');
  chmodSync(nodeCheckPath, 0o755);

  writeFileSync(
    integrationScriptPath,
    `#!/usr/bin/env bash
echo "integration:$*" >> "${commandLogPath}"
exit ${runExitCode}
`
  );
  chmodSync(integrationScriptPath, 0o755);

  writeFileSync(
    join(binDir, 'npm'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "$*" >> "${commandLogPath}"
cmd="$*"
if [[ "$cmd" == "run build" ]]; then
  exit 0
fi
if [[ "$cmd" == "run start -- daemon start --log-level warn --log-file "* ]]; then
  exit 0
fi
if [[ "$cmd" == "run start -- --text daemon stop" ]]; then
  exit 0
fi
if [[ "$cmd" == "run start -- --text daemon status" ]]; then
  count=0
  if [[ -f "${statusCountPath}" ]]; then
    count="$(cat "${statusCountPath}")"
  fi
  count=$((count + 1))
  echo "$count" > "${statusCountPath}"
  if (( count == 1 )); then
    echo "Daemon is not running"
    exit 2
  fi
  printf 'Status: running\\nPID: 123\\nUptime: 1s\\nWebSocket port: 3002\\nControl port: 3100\\nBridge connected: true\\n'
  exit 0
fi
echo "unexpected npm invocation: $cmd" >&2
exit 1
`
  );
  chmodSync(join(binDir, 'npm'), 0o755);

  return {
    scriptPath,
    commandLogPath,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      HOME: tempRoot,
    },
  };
}

describe('run-agent-integration-test.sh', () => {
  it('stops the daemon it started after a successful integration run', () => {
    const sandbox = setupCliWrapperSandbox(0);

    const result = spawnSync('bash', [sandbox.scriptPath, '--yes'], {
      cwd: resolve(process.cwd()),
      encoding: 'utf-8',
      env: sandbox.env,
    });

    const commandLog = readFileSync(sandbox.commandLogPath, 'utf-8');

    expect(result.status).toBe(0);
    expect(commandLog).toContain('run start -- daemon start --log-level warn --log-file');
    expect(commandLog).toContain('integration:--yes');
    expect(commandLog).toContain('run start -- --text daemon stop');
  });

  it('stops the daemon it started after a failed integration run', () => {
    const sandbox = setupCliWrapperSandbox(7);

    const result = spawnSync('bash', [sandbox.scriptPath], {
      cwd: resolve(process.cwd()),
      encoding: 'utf-8',
      env: sandbox.env,
    });

    const commandLog = readFileSync(sandbox.commandLogPath, 'utf-8');

    expect(result.status).toBe(7);
    expect(commandLog).toContain('integration:');
    expect(commandLog).toContain('run start -- --text daemon stop');
  });
});
