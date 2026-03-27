#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${SCRIPT_DIR}/node-check.sh" || exit 1

WAIT_TIMEOUT_SECONDS="${REMNOTE_AGENT_WAIT_TIMEOUT:-45}"
POLL_INTERVAL_SECONDS="${REMNOTE_AGENT_POLL_INTERVAL:-2}"
LOG_FILE="${REMNOTE_AGENT_DAEMON_LOG:-${HOME}/.remnote-cli/daemon.log}"

started_daemon=0
deadline=$((SECONDS + WAIT_TIMEOUT_SECONDS))
built_cli=0

ensure_built_cli() {
  if (( built_cli == 1 )); then
    return
  fi

  echo "Building CLI before daemon startup/status checks..."
  npm run build
  built_cli=1
}

daemon_status() {
  ensure_built_cli
  npm run start -- --text daemon status 2>&1
}

start_daemon() {
  ensure_built_cli
  echo "CLI daemon is not running. Starting it in the background..."
  if ! npm run start -- daemon start --log-level warn --log-file "${LOG_FILE}"; then
    echo "CLI daemon failed to start. Log: ${LOG_FILE}"
    if [[ -f "${LOG_FILE}" ]]; then
      echo "Last daemon log lines:"
      tail -n 40 "${LOG_FILE}"
    fi
    exit 1
  fi
  started_daemon=1
}

while (( SECONDS < deadline )); do
  if output="$(daemon_status)"; then
    if grep -q 'Bridge connected: true' <<<"${output}"; then
      echo "Bridge connected. Running integration tests..."
      exec "${SCRIPT_DIR}/run-integration-test.sh" "$@"
    fi

    echo "CLI daemon is up, but the RemNote bridge is not connected yet. Waiting..."
  else
    if grep -q 'Daemon is not running' <<<"${output:-}" && (( started_daemon == 0 )); then
      start_daemon
    else
      echo "Waiting for CLI daemon to become reachable..."
    fi
  fi

  sleep "${POLL_INTERVAL_SECONDS}"
done

echo "Timed out after ${WAIT_TIMEOUT_SECONDS}s waiting for a connected RemNote bridge."
echo "Ensure RemNote is open and the Automation Bridge plugin is connected to the CLI daemon, then rerun."
if [[ -f "${LOG_FILE}" ]]; then
  echo "Daemon log: ${LOG_FILE}"
fi
exit 1
