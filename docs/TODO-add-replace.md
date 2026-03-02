# TODO: Add Replace Semantics For `update`

This document originally captured a future enhancement idea.

Status: core scope implemented in `0.8.0`.

## Goal

Add explicit replace semantics for note content updates in `remnote-cli`, for example:

- `remnote-cli update <rem-id> --replace "<text>"`
- `remnote-cli update <rem-id> --replace-file <path|->`

## Proposed Meaning

`replace` should overwrite existing note child content instead of appending.

Open design question:

- Replace only direct child bullets under `<rem-id>`, or
- Replace the entire descendant subtree.

Direct-child replacement was selected and implemented as the first version.

## Why This Is Cross-Repo

The bridge contract now supports both `appendContent` and `replaceContent`.

Implemented across companion repos:

1. `remnote-cli`
   - Add `--replace` / `--replace-file` flags and mutual-exclusion rules with append flags.
   - Map to a new payload field (for example `replaceContent`).
2. `remnote-mcp-bridge`
   - Extend `update_note` payload contract and adapter logic to execute replace semantics.
3. `remnote-mcp-server`
   - Extend Zod schema + MCP tool input schema/docs so MCP consumers get parity.

## Safety Notes (Current)

- Replace is potentially destructive; bridge settings provide an explicit replace gate.
- CLI enforces strict mutual exclusion between append and replace content flags.
- Tests cover replace pass-through, gate behavior, append/replace conflict, and empty replacement behavior.

## Remaining Future Ideas

1. Optional subtree-level replace mode (beyond direct children) if needed.
2. Optional extra confirmation patterns in interactive environments.
3. Additional live RemNote validation scenarios with large nested trees.
