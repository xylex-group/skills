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
bun run validate          # structural checks (coverage skipped by default)
bun run doctor            # self-diagnosis
bun run build:manifest    # generate generated/skill-manifest.json
bun run src/cli/index.ts explain path/to/file.ts
```

Environment knobs use the `XYLEX_PLUGIN_*` prefix (for example `XYLEX_PLUGIN_TELEMETRY=on` is opt-in only; telemetry is off by default).

## Ecosystem graph

See [`xylex.md`](xylex.md) for product relationships and skill links.

## Disclaimer

The code in this repository is experimental and for reference purposes only. Community feedback is welcome but this project is not officially supported in the same way that repositories in the official [XYLEX Group GitHub organization](https://github.com/xylex-group) are. If you need help you can file an issue on this repository, or [contact XYLEX Group](https://xylex-group.us/contact-sales).
