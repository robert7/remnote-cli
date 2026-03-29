---
name: remnote
description: Search, read, and write RemNote notes and personal knowledge base content via `remnote-cli`. Use for note-taking, journaling, tags, and knowledge-base navigation; require `confirm write` before create/update/journal.
homepage: https://github.com/robert7/remnote-cli
metadata:
  {
    "openclaw":
      {
        "emoji": "🌀",
        "requires": { "bins": ["remnote-cli"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "remnote-cli",
              "bins": ["remnote-cli"],
              "label": "Install remnote-cli (npm)",
            },
          ],
      },
  }
---

# RemNote via remnote-cli

Use this skill when a user wants to read or manage RemNote content from the command line with `remnote-cli`.

If the user needs navigation across the whole knowledge base (for example: "where does this topic live in my notes?",
"start from top-level note tree", "map main note groups"), prefer `remnote-kb-navigation` when it is available and
customized for the current user, then return to this skill for general command policy and write gating. If
`remnote-kb-navigation` is not available (or still template/unconfigured), continue with this skill alone and ask for
skill customization when needed.

## Example Conversation Triggers

- "Check if RemNote bridge is connected."
- "Search my RemNote for sprint notes."
- "Find notes tagged weekly-review in RemNote."
- "Read this RemNote by ID: `<rem-id>`."
- "Map the top-level structure of my whole RemNote knowledge base."
- "Create a RemNote note titled X with this content." (requires `confirm write`)
- "Append this to my journal in RemNote." (requires `confirm write`)

## Preconditions (required)

1. RemNote Automation Bridge plugin is installed in RemNote.
2. Plugin install path is one of:
   - Marketplace install guide:
     `https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/install-plugin-via-marketplace-beginner.md`
   - Local dev plugin guide:
     `https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/development-run-plugin-locally.md`
3. `remnote-cli` is installed on the same machine where OpenClaw runs.
   - Preferred install: `npm install -g remnote-cli`
4. RemNote is open in browser/app (`https://www.remnote.com/`).
5. `remnote-cli` daemon is running (`remnote-cli daemon start`).
6. The right-sidebar `MCP` panel is available for status inspection and manual reconnect when needed, but it is not
   required to already be open before commands work.

If any precondition is missing, stop and fix setup first.

## Read-First Safety Policy

- Default to read-only flows: `status`, `search`, `search-tag`, `read`, `daemon status`.
- Do not run mutating commands by default.
- For writes (`create`, `update`, `journal`), require the exact phrase `confirm write` from the user in the same turn.
- If `confirm write` is not present, ask for confirmation and do not execute writes.

## Command Invocation Rule (critical)

- Run exactly one `remnote-cli` command per execution.
- Invoke `remnote-cli` directly; do not chain shell commands.
- Do not use `&&`, `|`, `;`, subshells (`(...)`), command substitution (`$()`), `xargs`, or `echo` pipelines.
- WRONG: `remnote-cli daemon status --text && echo '---' && remnote-cli status --text`
- RIGHT: `remnote-cli daemon status --text`
- RIGHT: `remnote-cli status --text`
- Reason: command chaining can trigger exec approvals and break automation flow.

## Write Payload Rule (allowlist-friendly)

- For write commands, prefer file-based payload flags:
  - `--content-file <path|->` for `create` / `journal`
  - `--append-file <path|->` or `--replace-file <path|->` for `update`
- Keep executed command strings short and predictable for OpenClaw allowlisting.
- Inline `--content` / `--append`/positional `journal [content]`/positional `create [title]` are discouraged except for very short single-line text.
- With markdown syntax input, all options must use flags to prevent misinterpretation of the content as command options.
- `-` (stdin) is supported but discouraged by default in OpenClaw flows because command context can be less explicit.

## Compatibility Check (mandatory before real work)

1. Check daemon and bridge connectivity:
   - `remnote-cli daemon status --text`
   - `remnote-cli status --text`
2. Read versions from `remnote-cli status --text`:
   - active plugin version
   - CLI version
   - `version_warning` (if present)
   - write-policy flags: `acceptWriteOperations`, `acceptReplaceOperation`
3. RemNote-open-first / daemon-starts-later is supported:
   - the bridge should retry in the background
   - the sidebar panel is optional and mainly useful for monitoring, manual reconnect, and wake-up triggers
4. Enforce version rule: bridge plugin and `remnote-cli` must be the same `0.x` minor line (prefer exact match).
5. If mismatch:
   - Install matching CLI version:
     - Exact: `npm install -g remnote-cli@<plugin-version>`
     - Or same minor line (`0.<minor>.x`) when exact is unavailable.
   - Re-run:
     - `remnote-cli --version`
     - `remnote-cli daemon restart` is not available, so run:
       - `remnote-cli daemon stop`
       - `remnote-cli daemon start`
     - `remnote-cli status --text`

## Core Commands

### Health and Connectivity

- `remnote-cli daemon start`
- `remnote-cli daemon status --text`
- `remnote-cli status --text`
- `remnote-cli --control-port 3110 status --text` for non-default daemon control ports

### Read-Only Operations (default)

- Search notes: `remnote-cli search "query"`
- Search by tag: `remnote-cli search-tag "tag"`
- Read note by Rem ID: `remnote-cli read <rem-id>`
- Optional text mode: add `--text`

## Output Mode and Traversal Strategy

- Use JSON output (default) for navigation, multi-step retrieval, and any flow that needs IDs for follow-up reads.
- Use `--text` only for plain human summarization of exactly one note when no further navigation is needed.
- Exit code `2` means the daemon is unreachable or not running.
- For structure traversal, start with shallow reads and high child limit:
  - `remnote-cli read <rem-id> --depth 1 --child-limit 500`
- Increase `--depth`, `--child-limit`, or `--max-content-length` only when the user actually needs more hierarchy or
  rendered content.

### `--include-content` modes

- `--include-content markdown`:
  - Returns readable rendered child content.
  - Best for summarization/presentation.
  - Markdown content does not provide child IDs required for further navigation.
- `--include-content structured`:
  - Returns hierarchical `contentStructured` data including child rem IDs.
  - Best for navigation and deterministic ID-first traversal.

### Mutating Operations (only after `confirm write`)

- Create (preferred): `remnote-cli create "Title" --content-file /tmp/body.md --text`
- Create under a parent or apply tags:
  - `remnote-cli create "Title" --parent-id <rem-id> --tags project active --text`
- Update (preferred): `remnote-cli update <rem-id> --title "New Title" --append-file /tmp/append.md --text`
- Update tags:
  - `remnote-cli update <rem-id> --add-tags active --remove-tags draft --text`
- Update replace (destructive, preferred only with explicit user intent):
  - `remnote-cli update <rem-id> --replace-file /tmp/replacement.md --text`
  - `remnote-cli update <rem-id> --replace "" --text` (clear all direct children)
- Journal: `remnote-cli journal "Finished task" --text`
- Journal (from file): `remnote-cli journal --content-file /tmp/entry.md --text`
- Journal without timestamp:
  - `remnote-cli journal --content-file /tmp/entry.md --no-timestamp --text`
- Fallbacks (discouraged): inline flags for short single-line text only.
- Safety:
  - Never combine append and replace flags in one command.
  - Run replace only when `acceptWriteOperations=true` and `acceptReplaceOperation=true` from `status`.
  - Treat replace as destructive and require the user to clearly request replace semantics.
  - Quote text values with spaces or special characters, and use explicit empty-value syntax like `--title=""` to avoid
    argument shifting.

## Failure Handling

When a bridge-backed operation fails (`search`, `search-tag`, `read`, `create`, `update`, `journal`, `status`), run
this sequence in order:

1. Check bridge status first:
   - `remnote-cli status --text`
2. If `status --text` fails with exit code `2` or says the daemon is unreachable:
   - run `remnote-cli daemon status --text`
   - if the daemon is not running, run `remnote-cli daemon start`
   - re-run `remnote-cli status --text`
3. If `status --text` shows `version_warning`:
   - align the CLI version to the plugin `0.x` minor line
   - restart with separate commands because `daemon restart` does not exist:
     - `remnote-cli daemon stop`
     - `remnote-cli daemon start`
   - re-run `remnote-cli status --text`
4. If the bridge is disconnected:
   - use the browser tool to ensure `https://www.remnote.com/` is open and reachable
   - re-run `remnote-cli status --text`
   - if needed, wait and retry for up to 30 seconds because the bridge may still be in burst retry or standby retry
5. If the browser tool is unavailable during recovery:
   - do not stop
   - use the OpenClaw-managed browser CLI against profile `openclaw` to try browser-side recovery:
     - `openclaw browser --browser-profile openclaw status`
     - if the CLI is reachable, run:
       - `openclaw browser --browser-profile openclaw stop`
       - `openclaw browser --browser-profile openclaw start`
       - `openclaw browser --browser-profile openclaw open https://www.remnote.com/`
   - after CLI-based browser recovery, re-run `remnote-cli status --text`
   - then retry the original RemNote command if bridge connectivity is restored
   - if the CLI reports browser disabled, bundled browser plugin missing/disabled, or another gateway-level browser
     unavailability state, report that specific browser/runtime condition instead of describing RemNote itself as broken
6. If it is still disconnected:
   - use the browser tool to open the right sidebar and click the `MCP` icon if present
   - opening the panel is itself a wake-up trigger and may restart faster retries
7. Inspect the plugin panel state:
   - `Connected` means retry the CLI command
   - `Connecting` means a connection attempt is in progress; wait briefly, then re-run `remnote-cli status --text`
   - `Retrying` means the burst retry window is active; wait briefly or use `Reconnect Now`
   - `Waiting for server` means standby mode is active; use `Reconnect Now` or another wake-up trigger
8. If the `MCP` icon is missing, report that the plugin UI is not available in RemNote.
9. If the panel is visible but still not connected:
   - capture the visible panel state, disconnect reason, and whether `Reconnect Now` helped
   - report that context to the user before stopping
10. Only after the sequence above fails should you report the command failure as unresolved.

## Operational Notes

- JSON output is default and preferred for automation.
- `--text` is useful for quick human checks.
- Reference command docs when unsure:
  `https://github.com/robert7/remnote-cli/blob/main/docs/guides/command-reference.md`
