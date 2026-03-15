# Command Reference

`remnote-cli` is automation-first: JSON is the default output mode. Use `--text` for human-readable output.

## Invocation

```bash
remnote-cli [global-options] <command> [command-options]
```

Most commands require a running daemon:

```bash
remnote-cli daemon start
```

Bridge actions (`create`, `search`, `search-tag`, `read`, `update`, `journal`, `status`) also require RemNote with
the RemNote Automation Bridge plugin connected to the daemon.

## Global Options

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | enabled | JSON output mode |
| `--text` | off | Human-readable output mode |
| `--control-port <port>` | `3100` | Control API port used by non-daemon commands |
| `--verbose` | off | Reserved for verbose stderr logging |
| `--version` | n/a | Show CLI version |
| `--help` | n/a | Show help |

### Output mode rules

- JSON is the default when no output flag is provided.
- If both `--json` and `--text` are passed, `--text` wins.

### Argument Quoting and Shifting

CLI environments (especially Windows shells) can sometimes "swallow" empty strings or misinterpret arguments if quoting is missing. This can lead to **argument shifting**, where a flag (like `--content`) is incorrectly interpreted as the *value* for a preceding option (like `--title`).

To prevent this:
1. **Always quote** text values that contain spaces or special characters.
2. **Use explicit equality** for potentially empty values: `--title=""`.
3. `remnote-cli` includes **shifting detection**: if an option value matches a registered global or local flag, the command will fail early with an error message to prevent accidental mis-execution.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Generic command/action error |
| `2` | Daemon not running / unreachable |
| `3` | Reserved for bridge-not-connected flows |

## daemon

Manage daemon lifecycle.

```bash
remnote-cli daemon <start|stop|status> [options]
```

### daemon start

Start the daemon in background mode (default) or foreground mode.

```bash
remnote-cli daemon start [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--ws-port <port>` | `3002` | WebSocket server port for bridge plugin connection |
| `--control-port <port>` | `3100` | HTTP control API port for CLI commands |
| `-f, --foreground` | `false` | Run in current process (no detach) |
| `--log-level <level>` | `silent` | One of `silent`, `debug`, `info`, `warn`, `error` |
| `--log-file <path>` | auto | Log destination file |

Behavior rules:

- Background mode detaches and returns after health check passes; default log file is `~/.remnote-cli/daemon.log`
  unless overridden.
- Foreground mode blocks in the current terminal, has no default log file, and upgrades default `--log-level` from
  `silent` to `info`.

Examples:

```bash
remnote-cli daemon start
remnote-cli daemon start --foreground --log-level debug --log-file ~/.remnote-cli/custom.log
```

### daemon stop

Stop a running daemon.

```bash
remnote-cli daemon stop
```

Behavior rules:

- Returns exit code `2` if no running daemon is found.
- Attempts graceful shutdown first, then falls back to process termination if needed.

Examples:

```bash
remnote-cli daemon stop
remnote-cli --text daemon stop
```

### daemon status

Show daemon process health.

```bash
remnote-cli daemon status
```

Behavior rules:

- Returns health fields including PID, uptime, ports, and `wsConnected`.
- Returns exit code `2` when daemon is not running.

Examples:

```bash
remnote-cli daemon status
remnote-cli --text daemon status
```

## create

Create a new RemNote note or a hierarchical tree.

```bash
remnote-cli create [title] [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--title <text>` | none | Note title |
| `-c, --content <text>` | none | Initial content (markdown supported) |
| `--content-file <path>` | none | Read initial content from UTF-8 file (`-` for stdin) |
| `--parent-id <id>` | none | Parent Rem ID |
| `-t, --tags <tag...>` | none | One or more tags |

Behavior rules:

- `title` and `content` are both optional, but **at least one must be provided**.
- Title input support positional `[title]` (backward-compatible) and `--title <text>`.
- Content input from `-c`/`--content`/`--content-file` supports RemNote's native markdown syntax for creating nested hierarchies and flashcards inline.
- `--content` and `--content-file` are mutually exclusive.
- Content loaded from file/stdin is passed verbatim (no templating/interpolation).
- Write content from `--content-file`/`--append-file`/`--replace-file`/stdin is capped at 100 KB.
- If `parent-id` is not provided, the note will be created under the default root rem in the setting.
- Tags are applied only to the top-level Rems created.

Examples:

```bash
# Simple note with title only, either by positional argument or --title option, create under default root rem
remnote-cli create "Meeting Notes"
remnote-cli create --title "Meeting Notes"

# Create a new note under a specific parent rem id
remnote-cli create --title "Meeting Notes" --parent-id <parent-rem-id>

# Create a new note with title and content
remnote-cli create --title "Project Plan" --content "Phase 1" --tags planning work

# Create a new note with markdown content directly under parent rem id
# Note: if the content is in markdown format, --content/--content-file must be used to avoid misinterpretation of the content as command options
remnote-cli create --content "- Item 1\n  - Item 2" --parent-id <parent-rem-id>

# Flashcards
remnote-cli create --title "Photosynthesis" --content "Front :: Back"

# Hierarchical tree from file or from parsed markdown
remnote-cli create --title "Biology Terms" --content-file /tmp/biology.md
remnote-cli create --title "Biology Terms" --content "# Terms 1\n- Item 1\n  - Item 2"
```

## search

Search notes by text query.

```bash
remnote-cli search <query> [options]
```

Shared options for `search` and `search-tag`:

| Option | Default | Description |
|--------|---------|-------------|
| `-l, --limit <n>` | `50` | Maximum number of results |
| `--include-content <mode>` | `none` | `none`, `markdown`, or `structured` |
| `--depth <n>` | `1` | Child depth for rendered content |
| `--child-limit <n>` | `20` | Max children per hierarchy level |
| `--max-content-length <n>` | `3000` | Max rendered content character count |

Behavior rules:

- In `--text` mode, each line includes headline/title and Rem ID.
- Parent context is appended in text output when available as `<- Parent Title [parentRemId]`.
- `--depth`, `--child-limit`, and `--max-content-length` are most relevant when content rendering is enabled.

Examples:

```bash
remnote-cli search "meeting"
remnote-cli search "weekly" --limit 10 --include-content structured --depth 2 --child-limit 10 --text
```

## search-tag

Search notes by tag (ancestor-context aware).

```bash
remnote-cli search-tag <tag> [options]
```

Options and output/content controls are identical to `search`
(`-l/--limit`, `--include-content`, `--depth`, `--child-limit`, `--max-content-length`).

Examples:

```bash
remnote-cli search-tag "#daily"
remnote-cli search-tag "weekly" --include-content markdown --depth 2 --text
```

## read

Read one note by Rem ID.

```bash
remnote-cli read <rem-id> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --depth <n>` | `5` | Child depth to render |
| `--include-content <mode>` | `markdown` | `markdown`, `structured`, or `none` |
| `--child-limit <n>` | `100` | Max children per hierarchy level |
| `--max-content-length <n>` | `100000` | Max rendered content character count |

Behavior rules:

- `--text` mode prints metadata when present: title/headline, ID, type, parent, aliases, card direction, and content
  stats.
- If `content` exists, it is printed after a blank line.
- In structured mode, use JSON output (default) to preserve `contentStructured` rem IDs and child hierarchy.
- `--include-content none` suppresses rendered content.

Examples:

```bash
remnote-cli read abc123def
remnote-cli read abc123def --include-content none --depth 2 --child-limit 30 --max-content-length 5000 --text
remnote-cli read abc123def --include-content structured --depth 2 --child-limit 30
```

## update

Update an existing note.

```bash
remnote-cli update <rem-id> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--title <text>` | none | Replace title/headline |
| `--append <text>` | none | Append content |
| `--append-file <path>` | none | Read appended content from UTF-8 file (`-` for stdin) |
| `--replace <text>` | none | Replace direct child content (empty string clears all direct children) |
| `--replace-file <path>` | none | Read replacement content from UTF-8 file (`-` for stdin; empty file clears all direct children) |
| `--add-tags <tag...>` | none | Add one or more tags |
| `--remove-tags <tag...>` | none | Remove one or more tags |

Behavior rules:

- Options can be combined in one call (title/content/tag updates in one request).
- At least one update field should be provided.
- Input from `--append`/`--append-file`/`--replace`/`--replace-file` supports RemNote's native markdown syntax for creating nested hierarchies and flashcards inline.
- `--append` and `--append-file` are mutually exclusive.
- `--replace` and `--replace-file` are mutually exclusive.
- Append and replace are mutually exclusive in a single command:
  - Do not combine `--append/--append-file` with `--replace/--replace-file`.
- Replace behavior updates direct child bullets of the target note:
  - `--replace ""` (or `--replace-file` with an empty file) clears all direct children.
- Bridge write policy can reject update commands:
  - If bridge setting **Accept write operations** is disabled, all `update` operations fail.
  - If write operations are enabled but **Accept replace operation** is disabled, replace flags fail.

Examples:

```bash
remnote-cli update abc123def --title "Updated Title"
remnote-cli update abc123def --title "Final" --append "Shipped" --add-tags important --remove-tags draft --text
remnote-cli update abc123def --append-file /tmp/follow-up.md --text
remnote-cli update abc123def --replace-file /tmp/new-body.md --text
remnote-cli update abc123def --replace "" --text
cat /tmp/follow-up.md | remnote-cli update abc123def --append-file - --text
cat /tmp/new-body.md | remnote-cli update abc123def --replace-file - --text
```

## journal

Append to today's daily document.

```bash
remnote-cli journal [content] [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--content <text>` | none | Journal entry content |
| `--content-file <path>` | none | Read journal entry from UTF-8 file (`-` for stdin) |
| `--no-timestamp` | timestamp enabled | Disable `[HH:MM:SS]` prefix |

Behavior rules:

- Provide exactly one content source:
  - positional `[content]` (backward-compatible)
  - `--content <text>`
  - `--content-file <path|->`
- Content input from `--content`/`--content-file` supports RemNote's native markdown syntax for creating nested hierarchies and flashcards inline.

Examples:

```bash
remnote-cli journal "Finished sprint review"
remnote-cli journal --content "Quick thought" --no-timestamp --text
remnote-cli journal --content-file /tmp/entry.md --text
cat /tmp/entry.md | remnote-cli journal --content-file - --text
```

## status

Check bridge connection state.

```bash
remnote-cli status
```

Behavior rules:

- Calls daemon `get_status` and reports bridge connectivity.
- JSON output includes bridge write-policy flags when available:
  - `acceptWriteOperations`
  - `acceptReplaceOperation`
- In text mode, output includes:
  - bridge connection status
  - plugin version when provided
  - CLI version when provided
  - compatibility warning (`version_warning`) when provided
- Returns exit code `2` when daemon is unreachable.

Examples:

```bash
remnote-cli status
remnote-cli --control-port 3110 status --text
```
