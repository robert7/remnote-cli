# Daemon Management

## Starting the Daemon

```bash
# Background mode (default)
remnote-cli daemon start

# Foreground mode (logs to stderr, useful for debugging)
remnote-cli daemon start --foreground

# Custom ports
remnote-cli daemon start --ws-port 4002 --control-port 4100

# With logging
remnote-cli daemon start --log-level debug --log-file ~/.remnote-cli/daemon.log
```

In background mode, the CLI spawns a detached child process and waits for it to become healthy before exiting.
In foreground mode, the daemon runs in the current terminal — use Ctrl+C to stop.

## Stopping the Daemon

```bash
remnote-cli daemon stop
```

Sends a graceful shutdown request. Falls back to SIGTERM after 3 seconds if the daemon doesn't exit.

## Checking Status

```bash
# Machine-readable (JSON, default)
remnote-cli daemon status

# Human-readable
remnote-cli daemon status --text
```

Reports: running/stopped, PID, uptime, WebSocket port, control port, bridge connection state.

## PID File

Location: `~/.remnote-cli/daemon.pid`

Contains JSON: `{ pid, wsPort, controlPort, startedAt }`. CLI commands read this to discover the control port.
Automatically cleaned up on `daemon stop`. Stale PID files (dead process) are detected and removed on next
`daemon start`.

## Log File

When running in background mode, logs go to `~/.remnote-cli/daemon.log` by default. Override with `--log-file`.
In foreground mode, logs go to stderr.

Default log level is `silent` (no output). Set `--log-level debug` or `--log-level info` for visibility.
Foreground mode defaults to `info` level.
