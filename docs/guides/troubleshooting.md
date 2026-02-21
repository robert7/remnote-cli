# Troubleshooting

## Port Conflicts

**Symptom:** `daemon start` fails with "address already in use"

**Fix:** Another process is using port 3002 (WebSocket) or 3100 (control API). Either stop that process or use
different ports:

```bash
remnote-cli daemon start --ws-port 4002 --control-port 4100
# Then use --control-port for all commands:
remnote-cli status --control-port 4100
```

## Bridge Not Connecting

**Symptom:** `remnote-cli status` shows `connected: false`

**Checklist:**
1. Is RemNote running?
2. Is the RemNote Automation Bridge plugin installed and enabled in RemNote?
3. Is the daemon running on port 3002? (The bridge connects to this port)
4. Check daemon logs: `remnote-cli daemon start --foreground --log-level debug`

## Daemon Won't Start

**Symptom:** `daemon start` hangs or times out

**Fix:** Try foreground mode to see error output:

```bash
remnote-cli daemon start --foreground --log-level debug
```

Common causes:
- Port already in use (see above)
- Stale PID file — `daemon start` should auto-detect and clean up, but you can manually remove
  `~/.remnote-cli/daemon.pid` if needed

## Daemon Won't Stop

**Symptom:** `daemon stop` reports success but daemon is still running

**Fix:** The daemon has a 3-second graceful shutdown window, then receives SIGTERM. If it still won't stop:

```bash
# Find the PID
cat ~/.remnote-cli/daemon.pid
# Force kill
kill -9 <pid>
# Clean up PID file
rm ~/.remnote-cli/daemon.pid
```

## Command Timeouts

**Symptom:** Commands hang for 5+ seconds then fail with "Request timeout"

**Cause:** The bridge plugin received the request but didn't respond in time. This can happen if RemNote is
busy or the plugin encountered an error. Check RemNote's developer console for plugin errors.
