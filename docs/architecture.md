# Architecture

## Why a Daemon?

The RemNote Bridge plugin is a WebSocket **client** — it connects to a server at `ws://127.0.0.1:3002`. In the MCP
integration path, the MCP server hosts that WebSocket server. For the CLI path, the CLI itself must host it.

Running a WebSocket server in every short-lived CLI command would be impractical: the bridge would need to reconnect
for each command. Instead, a long-running daemon process hosts both the WebSocket server and an HTTP control API.
CLI commands are short-lived HTTP clients that dispatch requests to the daemon.

This keeps both integration paths at exactly two components:

- **MCP path:** Bridge Plugin + MCP Server
- **CLI path:** Bridge Plugin + CLI Daemon

## IPC: Why HTTP?

The daemon exposes `http://127.0.0.1:3100` for CLI→daemon communication.

- **Cross-platform:** Works identically on macOS, Linux, and Windows. Unix sockets require platform-specific paths.
- **Debuggable:** `curl http://127.0.0.1:3100/health` works out of the box.
- **Zero dependencies:** Node 18+ includes `fetch()` and `node:http`. No IPC libraries needed.
- **Familiar:** HTTP request/response semantics map directly to command/result.

## Process Model

```
daemon start (foreground=false)
  └─ spawn detached child: node dist/index.js daemon start --foreground
       ├─ WebSocket Server on :3002
       ├─ HTTP Control Server on :3100
       └─ PID file at ~/.remnote-cli/daemon.pid
```

The parent process spawns a detached child, waits for `/health` to return 200, then exits. The child writes a PID
file containing `{ pid, wsPort, controlPort, startedAt }`. CLI commands read this file to discover the control port.

## Control API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/execute` | Forward `{ action, payload }` to bridge via WebSocket |
| `GET` | `/health` | Return daemon status, PID, uptime, bridge connection state |
| `POST` | `/shutdown` | Initiate graceful shutdown |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Daemon not running |
| 3 | Bridge not connected |
