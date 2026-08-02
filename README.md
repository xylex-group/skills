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
bun run build             # hooks + skill-manifest + catalog
bun run ci                # lint + typecheck + test + build + validate + doctor
bun run src/cli/index.ts explain path/to/file.ts
```

| Script | Purpose |
| ------ | ------- |
| `lint` / `check` | Ultracite (Biome) |
| `fix` / `format` | Auto-fix format + safe lint fixes |
| `typecheck` | `tsc` on `hooks/src` |
| `test` | Typecheck + `bun test hooks` |
| `build` | Skills, hooks (tsup), manifest, skill catalog |
| `validate` | Cross-refs, frontmatter, profiler slugs, fixtures |
| `validate:catalog` | Marketplace catalog rules (`marketplace.json` + LICENSE) |
| `build:plugin-index` | Regenerate `.grok-plugin/plugin-index.json` (never hand-edit) |
| `build:plugin-index:check` | Fail if plugin-index is stale |
| `ci` | Full green pipeline (includes catalog + plugin-index checks) |

Environment knobs use the `XYLEX_PLUGIN_*` prefix (for example `XYLEX_PLUGIN_TELEMETRY=on` is opt-in only; telemetry is off by default).

## Grok plugin marketplace

This repo is also a **plugin marketplace index** for Grok Build: it points at plugin sources so
agents can browse, install, and update them. See [CONTRIBUTING.md](CONTRIBUTING.md) to submit a
plugin.

### Repo layout

| Path | Purpose |
|---|---|
| [`.grok-plugin/marketplace.json`](.grok-plugin/marketplace.json) | The catalog index — source of truth |
| [`.grok-plugin/plugin-index.json`](.grok-plugin/plugin-index.json) | Generated component catalog — **never hand-edit** |
| `plugins/` | First-party plugins owned and maintained by XYLEX Group |
| `external_plugins/` | Third-party plugins (vendored local copies) |
| [`LICENSE`](LICENSE) | MIT at the repository root |

### Catalog plugins

| Plugin | Path | Skills source |
| ------ | ---- | ------------- |
| [`athena`](plugins/athena/) | `./plugins/athena` | `~/.grok/skills/athena-*` (vendored) |
| [`xbp`](plugins/xbp/) | `./plugins/xbp` | `~/.grok/skills/xbp`, `setup-xbp-deploy` (vendored) |
| [`xylex-group-plugin`](.) | `./` (repo root) | Root `skills/` + hooks |

First-party plugins live under `plugins/<name>/`. Third-party plugins go under
`external_plugins/<name>/` or use a remote `url` + pinned `sha` (Vercel-style).

To refresh Athena/XBP skills from your local Grok library:

```powershell
# example: re-copy one skill
Copy-Item -Recurse -Force "$env:USERPROFILE\.grok\skills\xbp" plugins\xbp\skills\xbp
python scripts/generate-plugin-index.py
```

### What a plugin is

A plugin is a directory bundling any combination of:

| Component | Location | Purpose |
|---|---|---|
| Skills | `skills/` | `SKILL.md` capabilities |
| Commands | `commands/` | Slash commands |
| Agents | `agents/` | Subagent definitions |
| Hooks | `hooks/hooks.json` | Lifecycle hooks |
| MCP servers | `.mcp.json` | MCP server configs |
| LSP servers | `.lsp.json` | Language server configs |

An optional `.grok-plugin/plugin.json` (or `.claude-plugin/plugin.json`) manifest adds metadata.

### Catalog format

Each entry in `marketplace.json` → `plugins`:

| Field | Required | Description |
|---|---|---|
| `name` | yes | kebab-case plugin id |
| `source` | yes | Where to fetch the plugin (see below) |
| `description` | recommended | Shown when browsing |
| `category` | no | e.g. `development`, `deployment`, `monitoring` |
| `homepage` | no | Project URL |
| `keywords` | no | Brand-scoped terms that suggest this plugin |
| `domains` | no | Hosts that suggest this plugin when pasted |
| `version`, `author`, `license`, `tags` | no | Display metadata |

### Source types

**Remote** — upstream repo pinned to a full commit SHA (recommended for third-party). Nothing is
vendored here; only the catalog entry is added:

```json
{
  "name": "my-plugin",
  "description": "What the plugin does.",
  "category": "development",
  "source": {
    "source": "url",
    "url": "https://github.com/my-org/my-plugin.git",
    "sha": "0000000000000000000000000000000000000000"
  },
  "homepage": "https://github.com/my-org/my-plugin",
  "keywords": ["my-plugin"],
  "domains": ["example.com"]
}
```

**Local** — files vendored under `plugins/<name>/` (first-party) or `external_plugins/<name>/`
(third-party):

```json
{
  "name": "my-plugin",
  "source": { "type": "local", "path": "./plugins/my-plugin" }
}
```

### SHA pinning (required for remote sources)

Every `url` source must pin a full 40-character lowercase commit `sha`:

```bash
git ls-remote https://github.com/my-org/my-plugin.git HEAD
```

### Plugin component index

`.grok-plugin/plugin-index.json` lists what each plugin provides (skills, commands, agents, MCP
servers, hooks, LSP servers) so clients can show contents before install. It is **generated — never
hand-edit it**:

```bash
python3 scripts/generate-plugin-index.py
# or: bun run build:plugin-index
```

CI runs `python3 scripts/generate-plugin-index.py --check` and fails if the committed file is stale.

### Add or update a plugin

1. Place first-party plugins in `plugins/` and third-party plugins in `external_plugins/` (local),
   or reference an upstream repo with a remote source.
2. Add or edit the entry in `.grok-plugin/marketplace.json`.
3. For remote sources, set `sha` to the exact commit you want to ship.
4. Regenerate and validate:
   ```bash
   python3 scripts/generate-plugin-index.py
   python3 scripts/validate-catalog.py
   python3 scripts/generate-plugin-index.py --check
   ```
5. Open a PR (use the PR template checklist).

To roll out an update, bump `sha` (remote) or commit the changed files (local), then regenerate the
index.

## Ecosystem graph

See [`xylex.md`](xylex.md) for product relationships and skill links.

## Disclaimer

The code in this repository is experimental and for reference purposes only. Community feedback is welcome but this project is not officially supported in the same way that repositories in the official [XYLEX Group GitHub organization](https://github.com/xylex-group) are. If you need help you can file an issue on this repository, or [contact XYLEX Group](https://xylex-group.us/contact-sales).
