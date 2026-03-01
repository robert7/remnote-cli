# OpenClaw Skill: RemNote

This directory contains an OpenClaw skill package for using RemNote through `remnote-cli`.

- Skill path: `openclaw-skill/remnote/SKILL.md`
- Primary use: read-first RemNote automation (`status`, `search`, `search-tag`, `read`)
- Write safety: mutating commands are gated and require exact user phrase `confirm write`
- Setup focus: plugin + CLI compatibility checks (`0.x` minor line alignment)
- KB navigation template path: `openclaw-skill/remnote-kb-navigation/SKILL.md`
- KB navigation template setup guide: `openclaw-skill/remnote-kb-navigation/CUSTOMIZATION.md`

Important:

- `openclaw-skill/remnote-kb-navigation/SKILL.md` is a template only.
- It must be customized with real user-specific Rem IDs and branch map before use.

The skill is intended for OpenClaw agents and follows OpenClaw skill frontmatter conventions.
