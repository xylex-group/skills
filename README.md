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
| `process:raw-skills` | **E2E** raw-skills → plugins + marketplace index + catalog validate |
| `process:raw-skills:check` | Fail if `raw-skills/` and `plugins/` are out of sync |
| `e2e:raw-skills` | Alias of `process:raw-skills` |
| `validate` | Cross-refs, frontmatter, profiler slugs, fixtures |
| `validate:catalog` | Marketplace catalog rules (`marketplace.json` + LICENSE) |
| `build:copilot-marketplace` | Regenerate GitHub Copilot catalogs + `plugins/*/.plugin/plugin.json` |
| `build:copilot-marketplace:check` | Fail if Copilot catalogs/manifests are stale |
| `build:plugin-index` | Regenerate `.grok-plugin/plugin-index.json` (never hand-edit) |
| `build:plugin-index:check` | Fail if plugin-index is stale |
| `ci` | Full green pipeline (includes catalog + Copilot + plugin-index checks) |

Environment knobs use the `XYLEX_PLUGIN_*` prefix (for example `XYLEX_PLUGIN_TELEMETRY=on` is opt-in only; telemetry is off by default).

## Plugin marketplaces (Grok + Codex + GitHub Copilot)

This repo is a **plugin marketplace index** for Grok Build and ships matching **Codex / ChatGPT**
and **GitHub Copilot** (CLI + Copilot App) catalogs so the same first-party plugins install on
all three hosts. See [CONTRIBUTING.md](CONTRIBUTING.md) to submit a plugin.

### Repo layout

| Path | Purpose |
|---|---|
| [`.grok-plugin/marketplace.json`](.grok-plugin/marketplace.json) | Grok catalog index — source of truth for Grok |
| [`.grok-plugin/plugin-index.json`](.grok-plugin/plugin-index.json) | Generated component catalog — **never hand-edit** |
| [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json) | Codex / ChatGPT repo marketplace (same plugins) |
| [`.github/plugin/marketplace.json`](.github/plugin/marketplace.json) | **GitHub Copilot** catalog (CLI + Copilot App) — canonical path |
| [`.plugin/marketplace.json`](.plugin/marketplace.json) | Copilot alternate discovery path (kept identical) |
| `plugins/` | First-party plugins owned and maintained by XYLEX Group |
| `external_plugins/` | Third-party plugins (vendored local copies) |
| [`LICENSE`](LICENSE) | MIT at the repository root |

### Catalog plugins

| Plugin | Path | Skills | Icon |
| ------ | ---- | ------ | ---- |
| [`agent-tools`](plugins/agent-tools/) | `./plugins/agent-tools` | 14 | `assets/xbp.png` |
| [`architecture-plugins`](plugins/architecture-plugins/) | `./plugins/architecture-plugins` | 4 | `assets/xbp.png` |
| [`athena`](plugins/athena/) | `./plugins/athena` | 19 | `assets/athena.png` |
| [`audit-code-quality`](plugins/audit-code-quality/) | `./plugins/audit-code-quality` | 7 | `assets/xbp.png` |
| [`cloudflare`](plugins/cloudflare/) | `./plugins/cloudflare` | 13 | `assets/xbp.png` |
| [`engineering`](plugins/engineering/) | `./plugins/engineering` | 6 | `assets/xbp.png` |
| [`fix-pr-comments`](plugins/fix-pr-comments/) | `./plugins/fix-pr-comments` | 5 | `assets/xbp.png` |
| [`heroui`](plugins/heroui/) | `./plugins/heroui` | 12 | `assets/heroui.png` |
| [`rust`](plugins/rust/) | `./plugins/rust` | 6 | `assets/xbp.png` |
| [`ui-plugins`](plugins/ui-plugins/) | `./plugins/ui-plugins` | 9 | `assets/xbp.png` |
| [`xbp`](plugins/xbp/) | `./plugins/xbp` | 2 | `assets/xbp.png` |
| [`xylex-group-plugin`](.) | `./` (repo root) | root `skills/` + hooks | `assets/xbp.png` |

Stage under `raw-skills/<plugin>/`, then `bun run process:raw-skills`. Standard default icon is
`assets/xbp.png` unless the plugin has a dedicated asset (athena, heroui).

First-party plugins live under `plugins/<name>/`. Third-party plugins go under
`external_plugins/<name>/` or use a remote `url` + pinned `sha` (Vercel-style).

### Raw skills → plugins pipeline (e2e)

Stage skill trees under the **gitignored** `raw-skills/` folder, then process them
into first-party plugins in one command:

```text
raw-skills/
├── agent-tools/
├── architecture-plugins/
├── athena/
├── audit-code-quality/
├── cloudflare/
├── engineering/
├── fix-pr-comments/
├── heroui/                 # all heroui-* skills
├── rust/
├── ui-plugins/
├── xbp/
└── ${ANY_OTHER_PLUGIN}/    # scaffolds plugins/<name>/ when new
    └── my-skill/SKILL.md
```

```bash
# place skills, then:
pnpm run process:raw-skills
# aliases: bun run process:raw-skills | pnpm run e2e:raw-skills
```

That e2e command:

1. Discovers `raw-skills/<plugin>/**/SKILL.md` (and `raw-skills/<plugin>/skills/…`)
2. Scaffolds `plugins/<plugin>/` (`.codex-plugin`, `.grok-plugin`, `.plugin`, README) if missing
3. Syncs each skill into `plugins/<plugin>/skills/<skill>/`
4. Registers new plugins in Grok, Codex, and GitHub Copilot marketplaces (local source)
5. Regenerates Copilot catalogs (`.github/plugin` + `.plugin`) and per-plugin `.plugin/plugin.json`
6. Regenerates `.grok-plugin/plugin-index.json`
7. Runs `validate-catalog`
Useful flags (pass after `--` with pnpm):

```bash
pnpm run process:raw-skills -- --plugin athena
pnpm run process:raw-skills -- --sync-only
pnpm run process:raw-skills -- --check
pnpm run process:raw-skills -- --mirror
pnpm run process:raw-skills -- --dry-run
```

See [`raw-skills/README.md`](raw-skills/README.md) for the full layout.

```powershell
# example: stage one skill from the local Grok library, then process
New-Item -ItemType Directory -Force raw-skills/xbp | Out-Null
Copy-Item -Recurse -Force "$env:USERPROFILE\.grok\skills\xbp" raw-skills\xbp\xbp
pnpm run process:raw-skills -- --plugin xbp
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

Each first-party plugin ships:

| Manifest | Host |
|---|---|
| `.codex-plugin/plugin.json` | **Required** for Codex / ChatGPT — points at `skills`, optional hooks/MCP |
| `.grok-plugin/plugin.json` | Grok Build identity |
| `.plugin/plugin.json` | **Required** for GitHub Copilot CLI / Copilot App |
| `.claude-plugin/plugin.json` | Optional Claude-ecosystem identity |

Codex path rules: keep `skills`, `hooks`, and assets at the plugin root; only `plugin.json` lives
under `.codex-plugin/`. Paths in the manifest must be `./`-prefixed and stay inside the plugin root.

Copilot looks for plugin manifests at `.plugin/plugin.json`, root `plugin.json`,
`.github/plugin/plugin.json`, or `.claude-plugin/plugin.json` (in that order). Marketplace catalogs
are resolved from `marketplace.json`, `.plugin/marketplace.json`, `.github/plugin/marketplace.json`,
or `.claude-plugin/marketplace.json`.

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

### Codex marketplace

Codex / ChatGPT read [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json). Entries
mirror the Grok catalog (all first-party plugins above, plus `xylex-group-plugin`) with local
`source.path` values and required `policy` + `category` fields. Point Codex at this repo with:

```bash
codex plugin marketplace add ./   # from a local clone
# or: codex plugin marketplace add xylex-group/skills
```

Then restart ChatGPT desktop (or refresh Codex plugins) and install from the **XYLEX Group** source.

### GitHub Copilot marketplace

GitHub Copilot CLI and the Copilot App read
[`.github/plugin/marketplace.json`](.github/plugin/marketplace.json) (mirrored at
[`.plugin/marketplace.json`](.plugin/marketplace.json)). Plugin `source` values are **relative path
strings** (e.g. `./plugins/athena`), not Grok/Codex source objects.

```bash
copilot plugin marketplace add xylex-group/skills
# or local clone:
copilot plugin marketplace add ./
copilot plugin marketplace browse xylex-group
copilot plugin install athena@xylex-group
```

If Copilot already cached a broken clone, remove and re-add the marketplace so it re-fetches the
catalog (`copilot plugin marketplace remove xylex-group` then `add` again), or refresh with
`copilot plugin marketplace update xylex-group`.

### Add or update a plugin

1. Place first-party plugins in `plugins/` and third-party plugins in `external_plugins/` (local),
   or reference an upstream repo with a remote source.
2. Add `.codex-plugin/plugin.json` (Codex), `.grok-plugin/plugin.json` (Grok), and
   `.plugin/plugin.json` (GitHub Copilot) under the plugin root, with `skills: "./skills/"` when
   the plugin bundles skills.
3. Add or edit the entry in `.grok-plugin/marketplace.json`,
   `.agents/plugins/marketplace.json`, **and** `.github/plugin/marketplace.json` (same plugin set;
   keep `.plugin/marketplace.json` identical to the Copilot catalog).
4. For remote Grok sources, set `sha` to the exact commit you want to ship.
5. Regenerate and validate:
   ```bash
   python3 scripts/sync-copilot-marketplace.py
   python3 scripts/generate-plugin-index.py
   python3 scripts/validate-catalog.py
   python3 scripts/sync-copilot-marketplace.py --check
   python3 scripts/generate-plugin-index.py --check
   # or: bun run build && bun run validate:catalog
   ```
6. Open a PR (use the PR template checklist).

To roll out an update, bump `sha` (remote) or commit the changed files (local), then regenerate the
index.

## Ecosystem graph

See [`xylex.md`](xylex.md) for product relationships and skill links.

## Disclaimer

The code in this repository is experimental and for reference purposes only. Community feedback is welcome but this project is not officially supported in the same way that repositories in the official [XYLEX Group GitHub organization](https://github.com/xylex-group) are. If you need help you can file an issue on this repository, or [contact XYLEX Group](https://xylex-group.us/contact-sales).
