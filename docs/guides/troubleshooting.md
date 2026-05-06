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
3. Is the daemon running on port 3002? (The bridge connects to this port.)
   - Check with `remnote-cli daemon status --text`
   - If needed, start it with `remnote-cli daemon start`
4. Re-check bridge status with `remnote-cli status --text`.
5. Give the bridge up to 30 seconds to reconnect automatically in the background after RemNote starts or after the
   daemon becomes available.
6. If RemNote was already open before the daemon started, background reconnect is still supported.
7. Open the Automation Bridge panel in the right sidebar if you want to inspect status or wake the bridge sooner.
   The panel is optional for normal operation; it is a monitoring and manual-control surface, not the thing that
   creates the connection.
8. If the panel is open:
   - **Connected** means the bridge is live.
   - **Connecting** means a connection attempt is in progress.
   - **Retrying** means the fast retry window is active.
   - **Waiting for server** means standby retry is active.
9. If the panel shows **Retrying** or **Waiting for server**, use **Reconnect Now** or interact inside RemNote
   (for example, switch notes or panes) to trigger a faster retry instead of waiting for the next scheduled attempt.
10. If the `MCP` icon is missing from the right sidebar toolbar, the plugin UI is not available; verify the plugin is
    installed and enabled.
11. Check daemon logs if you still need deeper debugging:
    `remnote-cli daemon start --foreground --log-level debug`

For detailed bridge retry phases and wake-up behavior, see the canonical bridge doc:
[Connection Lifecycle Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/connection-lifecycle.md).

## Version Mismatch After Upgrade

**Symptom:** `status` may show connected, but commands fail after upgrading the bridge plugin or `remnote-cli`.

**Fix:**
1. Check bridge plugin version in RemNote (or from `status` output if it reports `pluginVersion`).
2. Check CLI version: `remnote-cli --version`.
3. Install a compatible CLI version (prefer same minor line for `0.x`).
4. Restart the daemon after upgrading either side:
   - `remnote-cli daemon stop`
   - `remnote-cli daemon start`
   - `remnote-cli status --text`
5. See the [Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md).

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

**Symptom:** Commands hang for 15+ seconds then fail with "Request timeout"

**Cause:** The bridge plugin received the request but didn't respond in time. This can happen if RemNote is
busy or the plugin encountered an error. Check RemNote's developer console for plugin errors.

## Argument Shifting / Flag Swallowing

**Symptom:** Command fails with `looks like a flag but was passed as an option value` or `Argument shifting detected`.

**Cause:** The shell misinterpreted your command, likely because an empty string or a missing value caused the *next* flag to be consumed as the value for the *current* option.

Example of problematic syntax:
```bash
# This may fail if the shell treats --content as the value for --title
remnote-cli create --title --content "Note body"
```

**Fix:** Ensure every option that expects a value has one. Use explicit equality syntax to force empty values or avoid ambiguity:
```bash
# Explicit empty title
remnote-cli create --title="" --content "Note body"
```
