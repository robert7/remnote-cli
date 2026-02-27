---
name: remnote
description: Read/search RemNote via `remnote-cli` by default; require `confirm write` before create/update/journal.
homepage: https://github.com/robert7/remnote-cli
metadata:
  {
    "openclaw":
      {
        "emoji": "🧠",
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

## Example Conversation Triggers

- "Check if RemNote bridge is connected."
- "Search my RemNote for sprint notes."
- "Find notes tagged weekly-review in RemNote."
- "Read this RemNote by ID: `<rem-id>`."
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
6. The plugin panel is open in RemNote right sidebar and shows connected status.

If any precondition is missing, stop and fix setup first.

## Read-First Safety Policy

- Default to read-only flows: `status`, `search`, `search-tag`, `read`, `daemon status`.
- Do not run mutating commands by default.
- For writes (`create`, `update`, `journal`), require the exact phrase `confirm write` from the user in the same turn.
- If `confirm write` is not present, ask for confirmation and do not execute writes.

## Compatibility Check (mandatory before real work)

1. Check daemon and bridge connectivity:
   - `remnote-cli daemon status --text`
   - `remnote-cli status --text`
2. Confirm plugin panel is open in right sidebar and connected.
3. Read versions from `remnote-cli status --text`:
   - active plugin version
   - CLI version
   - `version_warning` (if present)
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

### Read-Only Operations (default)

- Search notes: `remnote-cli search "query" --text`
- Search by tag: `remnote-cli search-tag "tag" --text`
- Read note by Rem ID: `remnote-cli read <rem-id> --text`
- Optional JSON mode (default): omit `--text`

### Mutating Operations (only after `confirm write`)

- Create: `remnote-cli create "Title" --content "Body" --text`
- Update: `remnote-cli update <rem-id> --title "New Title" --append "More text" --text`
- Journal: `remnote-cli journal "Entry text" --text`

## Failure Handling

- Daemon unreachable (exit code `2`): start daemon and retry.
- Bridge not connected: open RemNote, open right sidebar plugin panel, verify connected state, retry `status`.
- Version mismatch warning: align `remnote-cli` version to plugin `0.x` minor line, then restart daemon.

## Operational Notes

- JSON output is default and preferred for automation.
- `--text` is useful for quick human checks.
- Reference command docs when unsure:
  `https://github.com/robert7/remnote-cli/blob/main/docs/guides/command-reference.md`
