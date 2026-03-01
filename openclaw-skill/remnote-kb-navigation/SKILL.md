---
name: remnote-kb-navigation
description: Template skill for navigating a user's RemNote knowledge base using root and top-level note IDs; customize before use.
---

# RemNote KB navigation template

Use this skill to orient quickly in a user's whole RemNote knowledge base.

## Template warning (critical)

- This file is a template and must be customized per user.
- Replace all values that start with `TEMPLATE_` before using this skill.
- If any `TEMPLATE_` value is still present, stop and ask the user to customize this skill first.

## Required customization fields

- User label: `TEMPLATE_USER_LABEL`
- Root headline: `TEMPLATE_ROOT_HEADLINE`
- Root rem ID: `TEMPLATE_ROOT_ID`
- Top-level branch map entries:
  - branch title/headline
  - branch rem ID
  - short routing hint

## Navigation rules

1. Use JSON output (default). Do not use `--text` for navigation.
2. Use ID-first traversal via `read`.
3. Start shallow (`--depth 1`) for orientation.
4. Use high child limit for full branch listings: `--child-limit 500`.
5. Keep operations read-only unless write confirmation policy allows mutating commands.

## Top-level map (customize)

- `TEMPLATE_BRANCH_1_HEADLINE` - `TEMPLATE_BRANCH_1_ID` - `TEMPLATE_BRANCH_1_HINT`
- `TEMPLATE_BRANCH_2_HEADLINE` - `TEMPLATE_BRANCH_2_ID` - `TEMPLATE_BRANCH_2_HINT`
- `TEMPLATE_BRANCH_3_HEADLINE` - `TEMPLATE_BRANCH_3_ID` - `TEMPLATE_BRANCH_3_HINT`

Add as many branches as needed for the user's real top-level structure.

## Recommended workflow

1. Read root for global orientation:
   - `remnote-cli read TEMPLATE_ROOT_ID --include-content structured --depth 1 --child-limit 500`
2. Pick the best top-level branch ID from the map.
3. Read that branch shallowly first:
   - `remnote-cli read <branch-id> --depth 1 --child-limit 500`
4. Descend deeper only in the selected subtree.
5. If multiple branches seem relevant, read 2-3 candidate branches shallowly, then ask a focused clarification.
