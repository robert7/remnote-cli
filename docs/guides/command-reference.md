# Command Reference

All commands output JSON by default. Use `--text` for human-readable output.

## create

Create a new note in RemNote.

```bash
remnote-cli create <title> [options]
```

| Option | Description |
|--------|-------------|
| `-c, --content <text>` | Note content |
| `--parent-id <id>` | Parent Rem ID |
| `-t, --tags <tag...>` | Tags to add |

**Examples:**

```bash
remnote-cli create "Meeting Notes" --text
remnote-cli create "Project Plan" --content "Phase 1: Research" --tags planning work
remnote-cli create "Sub-item" --parent-id abc123def
```

## search

Search for notes in RemNote.

```bash
remnote-cli search <query> [options]
```

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 10) |
| `--include-content` | Include note content in results |

**Examples:**

```bash
remnote-cli search "meeting notes" --text
remnote-cli search "project" --limit 5 --include-content
```

## read

Read a note by its Rem ID.

```bash
remnote-cli read <rem-id> [options]
```

| Option | Description |
|--------|-------------|
| `-d, --depth <n>` | Depth of children to include (default: 1) |

**Examples:**

```bash
remnote-cli read abc123def --text
remnote-cli read abc123def --depth 3
```

## update

Update an existing note.

```bash
remnote-cli update <rem-id> [options]
```

| Option | Description |
|--------|-------------|
| `--title <text>` | New title |
| `--append <text>` | Append content |
| `--add-tags <tag...>` | Tags to add |
| `--remove-tags <tag...>` | Tags to remove |

**Examples:**

```bash
remnote-cli update abc123def --title "Updated Title" --text
remnote-cli update abc123def --append "Additional content"
remnote-cli update abc123def --add-tags important --remove-tags draft
```

## journal

Append an entry to today's daily document.

```bash
remnote-cli journal <content> [options]
```

| Option | Description |
|--------|-------------|
| `--no-timestamp` | Omit timestamp prefix |

**Examples:**

```bash
remnote-cli journal "Completed sprint review" --text
remnote-cli journal "Quick thought" --no-timestamp
```

## status

Check bridge connection status (requires daemon running).

```bash
remnote-cli status
```

Returns connection state and plugin version.
