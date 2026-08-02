# XYLEX Group Agent Skills

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-1-green.svg)](#skills)

A collection of agent skills for AI coding agents working with XYLEX Group tools and technologies.

Skills follow the [Agent Skills](https://agentskills.io/) format and are installable via [skills.sh](https://skills.sh/).

## Installation

```bash
npx skills add xylex-group/skills
```

The CLI guides you through interactive install (skill selection, target agents, project vs global, symlink vs copy).

## Skills

| Skill | Description |
| ----- | ----------- |
| [`create-xylex-skill`](skills/create-xylex-skill/SKILL.md) | Scaffold a new `skills/*/SKILL.md` with correct frontmatter |

## Skill structure

```
skills/<name>/
├── SKILL.md          # Required — YAML frontmatter + agent instructions
├── references/       # Optional deep docs
└── scripts/          # Optional helpers
```

## SKILL.md format

Every skill **must** use YAML frontmatter between `---` fences:

```markdown
---
name: skill-name
description: >
  What the skill does. Use when the user mentions X, Y, or runs /skill-name.
summary: One-line summary for injection banners
metadata:
  priority: 5
  docs:
    - "https://example.com/docs"
  pathPatterns:
    - "src/**/*.ts"
  bashPatterns:
    - '\bmy-cli\b'
  importPatterns:
    - "@xylex-group/example"
  promptSignals:
    phrases:
      - "example phrase"
    minScore: 5
retrieval:
  aliases:
    - alternate name
  intents:
    - accomplish the task
  entities:
    - key concept
  examples:
    - user phrasing that should match
---

# Skill title

Agent instructions go here.
```

### Frontmatter fields

| Field | Required | Notes |
| ----- | -------- | ----- |
| `name` | **yes** | Matches directory name; `a-z0-9-` only |
| `description` | **yes** | What + when (triggers). Max 1024 chars for Agent Skills clients |
| `summary` | recommended | Short line for hook injection banners |
| `metadata.docs` | **yes** (this repo) | Non-empty list of `https://` URLs |
| `metadata.priority` | recommended | Higher = preferred when multiple skills match |
| `metadata.pathPatterns` | one of these three | Glob paths that should activate the skill |
| `metadata.bashPatterns` | one of these three | Regexes against shell commands |
| `metadata.importPatterns` | one of these three | Package import names |
| `metadata.promptSignals` | optional | Phrase / co-occurrence scoring for prompt injection |
| `retrieval` | recommended | aliases, intents, entities, examples for search |

Register every skill from `xylex.md` with a `⤳ skill: <name>` line so the ecosystem graph stays complete.

## Plugin tooling

This repo also ships a lightweight plugin runtime (hooks + CLI) rebranded from a skills-injection engine:

```bash
bun install
bun run lint              # Ultracite / Biome
bun run typecheck         # hooks TypeScript
bun test                  # typecheck + unit tests
bun run validate          # structural checks (coverage skipped by default)
bun run doctor            # self-diagnosis
bun run build             # hooks + skill-manifest + catalog + plugin-index
bun run ci                # lint + typecheck + test + build + validate + doctor
bun run src/cli/index.ts explain path/to/file.ts
```

| Script | Purpose |
| ------ | ------- |
| `lint` / `check` | Ultracite (Biome) |
| `fix` / `format` | Auto-fix format + safe lint fixes |
| `typecheck` | `tsc` on `hooks/src` |
| `test` | Typecheck + `bun test hooks` |
| `build` | Skills, hooks (tsup), manifest, skill catalog, plugin-index |
| `validate` | Cross-refs, frontmatter, profiler slugs, fixtures |
| `validate:catalog` | Grok marketplace catalog rules (`marketplace.json`) |
| `build:plugin-index` | Regenerate `.grok-plugin/plugin-index.json` (never hand-edit) |
| `build:plugin-index:check` | Fail CI if plugin-index is stale |
| `ci` | Full green pipeline |

Environment knobs use the `XYLEX_PLUGIN_*` prefix (for example `XYLEX_PLUGIN_TELEMETRY=on` is opt-in only; telemetry is off by default).

## Grok marketplace catalog

This repo is also a [Grok plugin marketplace](https://github.com/xylex-group/skills). Grok reads:

| Path | Role |
| ---- | ---- |
| [`.grok-plugin/marketplace.json`](.grok-plugin/marketplace.json) | Marketplace index (hand-maintained) |
| [`.grok-plugin/plugin-index.json`](.grok-plugin/plugin-index.json) | Component catalog (skills, hooks, …) — **generated, never hand-edit** |
| [`LICENSE`](LICENSE) | MIT at the repository root |

### Add or update a plugin entry

Checklist:

- [ ] Added/updated exactly one entry in `.grok-plugin/marketplace.json` (valid JSON, kebab-case `name`).
- [ ] Remote source pins a full 40-char lowercase commit `sha`, and that commit is public + reachable.
- [ ] Regenerated `.grok-plugin/plugin-index.json` (`python scripts/generate-plugin-index.py` or `bun run build:plugin-index`).
- [ ] `python scripts/validate-catalog.py` (or `bun run validate:catalog`) passes locally.
- [ ] `python scripts/generate-plugin-index.py --check` (or `bun run build:plugin-index:check`) passes locally.
- [ ] `homepage` + clear `description` set.
- [ ] License is stated (`license` on the entry + MIT `LICENSE` at the repo root).

```bash
# after editing marketplace.json or plugin contents:
bun run build:plugin-index
bun run validate:catalog
bun run build:plugin-index:check
```

## Ecosystem graph

See [`xylex.md`](xylex.md) for product relationships and skill links.

## Disclaimer

The code in this repository is experimental and for reference purposes only. Community feedback is welcome but this project is not officially supported in the same way that repositories in the official [XYLEX Group GitHub organization](https://github.com/xylex-group) are. If you need help you can file an issue on this repository, or [contact XYLEX Group](https://xylex-group.us/contact-sales).
