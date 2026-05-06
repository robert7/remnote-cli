# Demo

Demonstration of `remnote-cli` against a live RemNote + RemNote Automation Bridge plugin setup.

## Use RemNote from Any Coding Harness

Any local coding harness that can run shell commands can use `remnote-cli`. The only server component is
`remnote-mcp-server`, which is shared with MCP clients.

### Before you start

1. Install `remnote-mcp-server` and `remnote-cli` globally.
2. Start the MCP server: `remnote-mcp-server`.
3. Open RemNote and wait for the bridge to connect.
4. Verify: `remnote-cli status --text`.

### Example prompt

```text
read https://github.com/robert7/remnote-cli/blob/main/skills/remnote/SKILL.md

check remnote status using remnote CLI
search remnote for "AI assisted coding"
```

### Claude Code

![remnote-cli from Claude Code](images/remnote-cli-coding-harness-claude-code.jpg)

Claude Code fetches `SKILL.md`, verifies MCP-server-backed bridge status, then searches RemNote.

### GitHub Copilot CLI

![remnote-cli from GitHub Copilot CLI](images/remnote-cli-coding-harness-copilot-cli.jpg)

The same prompt works in GitHub Copilot CLI and other local harnesses that can read URLs and run shell commands.

## Example of OpenClaw Chat Workflow with `remnote-cli`

![remnote-cli with OpenClaw](images/remnote-cli-openclaw-1.jpg)

This screenshot shows [OpenClaw](https://github.com/openclaw/openclaw) driving `remnote-cli` from a WhatsApp chat: it
checks bridge connectivity, searches for "blue light", returns matching note IDs, and then attempts a `read`-based
summary.

### OpenClaw YouTube Summary Saved to RemNote Journal

![OpenClaw creating a YouTube summary and saving it to RemNote journal](images/remnote-cli-demo-journal-summary.jpg)

This screenshot shows OpenClaw creating a YouTube video summary and storing it as a RemNote journal entry.

Command:

```bash
remnote-cli journal --content-file summarize-output-n1e9-med.md --no-timestamp
```

## CLI Status and Search

![remnote-cli demo](images/remnote-cli-demo-1.jpg)

A typical local flow is:

1. Start `remnote-mcp-server`.
2. Run `remnote-cli status --text`.
3. Run `remnote-cli search "AI"`.

What this demonstrates:

- The CLI is a short-lived MCP client.
- JSON-first output is useful for automation and agent workflows.
- `status` and `status --text` are quick diagnostics when search/create calls fail.
