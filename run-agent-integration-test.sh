#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_REPO="${SCRIPT_DIR}/../remnote-mcp-server"

source "${SCRIPT_DIR}/node-check.sh" || exit 1

WAIT_TIMEOUT_SECONDS="${REMNOTE_AGENT_WAIT_TIMEOUT:-45}"
POLL_INTERVAL_SECONDS="${REMNOTE_AGENT_POLL_INTERVAL:-2}"
MCP_URL="${REMNOTE_MCP_URL:-http://127.0.0.1:3001/mcp}"
SERVER_LOG="${REMNOTE_AGENT_SERVER_LOG:-${TMPDIR:-/tmp}/remnote-mcp-server-agent.log}"

started_server=0
server_pid=""
deadline=$((SECONDS + WAIT_TIMEOUT_SECONDS))
built_cli=0
built_server=0
test_exit_code=0
cleanup_ran=0

ensure_built_cli() {
  if (( built_cli == 1 )); then
    return
  fi

  echo "Building CLI before MCP status checks..."
  npm run build
  built_cli=1
}

ensure_built_server() {
  if (( built_server == 1 )); then
    return
  fi

  if [[ ! -d "${SERVER_REPO}" ]]; then
    echo "Cannot auto-start MCP server: sibling repo not found at ${SERVER_REPO}"
    return 1
  fi

  echo "Building MCP server before startup..."
  (
    cd "${SERVER_REPO}"
    source "${SERVER_REPO}/node-check.sh" || exit 1
    npm run build
  )
  built_server=1
}

cli_status() {
  ensure_built_cli
  REMNOTE_MCP_URL="${MCP_URL}" npm run start -- --text status 2>&1
}

start_server() {
  if ! ensure_built_server; then
    exit 1
  fi

  echo "MCP server not reachable. Starting remnote-mcp-server in the background..."
  (
    cd "${SERVER_REPO}"
    nohup npm run start -- --log-level warn --log-file "${SERVER_LOG}" >"${SERVER_LOG}" 2>&1 &
    echo "$!" >"${SCRIPT_DIR}/.remnote-mcp-server-agent.pid"
  )
  server_pid="$(cat "${SCRIPT_DIR}/.remnote-mcp-server-agent.pid")"
  rm -f "${SCRIPT_DIR}/.remnote-mcp-server-agent.pid"
  started_server=1
  echo "Background MCP server started. Log: ${SERVER_LOG}"
}

cleanup() {
  if (( cleanup_ran == 1 )); then
    return
  fi
  cleanup_ran=1

  if (( started_server == 0 )) || [[ -z "${server_pid}" ]]; then
    return
  fi

  if ! kill -0 "${server_pid}" 2>/dev/null; then
    return
  fi

  echo "Stopping MCP server started by agent wrapper..."
  kill "${server_pid}" 2>/dev/null || true
  wait "${server_pid}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

while (( SECONDS < deadline )); do
  if output="$(cli_status)"; then
    if grep -q 'Bridge: Connected' <<<"${output}"; then
      echo "Bridge connected through MCP server. Running CLI integration tests..."
      set +e
      REMNOTE_MCP_URL="${MCP_URL}" "${SCRIPT_DIR}/run-integration-test.sh" "$@"
      test_exit_code=$?
      set -e
      exit "${test_exit_code}"
    fi

    echo "MCP server is reachable, but the RemNote bridge is not connected yet. Waiting..."
  else
    if (( started_server == 0 )); then
      start_server
    else
      echo "Waiting for MCP server to become reachable..."
    fi
  fi

  sleep "${POLL_INTERVAL_SECONDS}"
done

echo "Timed out after ${WAIT_TIMEOUT_SECONDS}s waiting for a connected RemNote bridge."
echo "Ensure RemNote is open and the Automation Bridge plugin is connected to ws://127.0.0.1:3002, then rerun."
if [[ -f "${SERVER_LOG}" ]]; then
  echo "Background MCP server log: ${SERVER_LOG}"
fi
exit 1
