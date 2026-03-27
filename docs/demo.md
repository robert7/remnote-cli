# Demo

Demonstration of `remnote-cli` against a live RemNote + RemNote Automation Bridge plugin setup.

## Example of OpenClaw Chat Workflow with `remnote-cli`

![remnote-cli with OpenClaw](images/remnote-cli-openclaw-1.jpg)

This screenshot shows [OpenClaw](https://github.com/openclaw/openclaw) driving 
`remnote-cli` from a WhatsApp chat: it checks bridge connectivity, runs a
`search` for "blue light", returns matching note IDs, and then attempts a `read`-based summary. The flow highlights
agent-to-CLI orchestration, quick status verification, and transparent handling when note content is incomplete.

### OpenClaw YouTube Summary Saved to RemNote Journal

![OpenClaw creating a YouTube summary and saving it to RemNote journal](images/remnote-cli-demo-journal-summary.jpg)

This screenshot shows [OpenClaw](https://github.com/openclaw/openclaw)
working through a Discord interface to create a YouTube video summary and store the result as
a **RemNote journal entry**. The summary content itself was generated with [summarize.sh](https://summarize.sh/) before
being passed into RemNote through the OpenClaw workflow.

Command: `remnote-cli journal --content-file summarize-output-n1e9-med.md --no-timestamp`

## CLI Startup, Connection, and Search

![remnote-cli demo](images/remnote-cli-demo-1.jpg)

This session shows a realistic first-run sequence:

1. `remnote-cli daemon start` starts the daemon (`wsPort: 3002`, `controlPort: 3100`).
2. An immediate `remnote-cli search "AI"` fails with plugin-not-connected error.
3. `remnote-cli status` then reports `connected: true` with `pluginVersion: "0.4.2"`.
4. `remnote-cli status --text` confirms the same in human-readable output.
5. `remnote-cli search "AI"` succeeds and returns matching notes in JSON.

What this demonstrates:

- Daemon startup and plugin connection are separate states.
- JSON-first output is useful for automation and agent workflows.
- `status` and `status --text` are quick diagnostics when search/create calls fail.
