# RemNote KB Navigation Template Customization

This template must be customized per user before use.

## Steps

1. Copy or edit `skills/remnote-kb-navigation/SKILL.md` for the target user.
2. Replace every `TEMPLATE_...` token.
3. Find the user's root note ID and headline.
4. Build top-level branch map from root children.
5. Add routing hints for each branch (what kind of requests should route there).
6. Verify no `TEMPLATE_` tokens remain.

## Suggested discovery commands

```bash
remnote-cli read <root-rem-id> --include-content structured --depth 1 --child-limit 500
remnote-cli read <branch-rem-id> --depth 1 --child-limit 500
```

## Acceptance checklist

- Root headline and root ID are real values.
- Top-level map contains real branch IDs.
- No `TEMPLATE_` tokens remain.
- Commands use JSON-first and ID-first traversal.
