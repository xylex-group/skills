# Raw skills staging

Drop unprocessed skill trees here. This directory (except this README) is
**gitignored** — nothing under `raw-skills/<plugin>/` is committed.

## Layout

```text
raw-skills/
├── README.md                 # tracked
├── athena/                   # plugin id → plugins/athena/
│   ├── athena-js/
│   │   ├── SKILL.md          # required
│   │   └── references/       # optional
│   └── athena-billing/
│       └── SKILL.md
├── agent-tools/              # 14 skills — authoring, linear, setup helpers
├── architecture-plugins/     # 4 skills — deep modules, domain, patterns
├── athena/                   # 19 athena-* skills
├── audit-code-quality/       # 7 skills — audit, fallow, drift
├── cloudflare/               # 13 skills — workers, wrangler, DO, turnstile…
├── engineering/              # 6 skills — tdd, sdd, review, contracts
├── fix-pr-comments/          # 5 skills — PR review fix pipelines
├── heroui/                   # 12 heroui-* skills
├── rust/                     # 6 skills — rust crates, path-rs, gov-uk
├── ui-plugins/               # 9 skills — design, transitions, anti-slop
├── xbp/                      # xbp + setup-xbp-deploy
└── ${ANY_OTHER_PLUGIN_NAME}/ # any kebab-case plugin id
    └── my-skill/
        └── SKILL.md
```

Default marketplace/Codex icon for new plugins is **`assets/xbp.png`** unless a
dedicated asset exists (`athena.png`, `heroui.png`).

Rules:

1. **Plugin folder** = marketplace plugin id (`a-z0-9` + hyphens), e.g. `athena`, `xbp`.
2. **Skill folder** = skill id; must contain `SKILL.md` (Agent Skills frontmatter).
3. Optional skill extras (`references/`, `scripts/`, `templates/`, …) are copied as-is.
4. Nested `skills/` under a plugin is also accepted: `raw-skills/athena/skills/foo/SKILL.md`.

## Process end-to-end

```bash
# after placing skills under raw-skills/<plugin>/…
pnpm run process:raw-skills
# or: bun run process:raw-skills
# or: npm run process:raw-skills
```

That command:

1. Discovers every `raw-skills/<plugin>/…` skill tree with a `SKILL.md`
2. Scaffolds `plugins/<plugin>/` (Codex + Grok manifests, README, `skills/`) if missing
3. Syncs each skill into `plugins/<plugin>/skills/<skill>/`
4. Registers the plugin in both marketplaces when it is new (local source)
5. Regenerates `.grok-plugin/plugin-index.json`
6. Runs catalog validation

### Useful flags

```bash
pnpm run process:raw-skills -- --plugin athena   # one plugin only
pnpm run process:raw-skills -- --sync-only       # copy only (no index / validate)
pnpm run process:raw-skills -- --check           # report what would change; exit 1 if stale
pnpm run process:raw-skills -- --mirror          # also delete dest skills not present in raw
pnpm run process:raw-skills -- --dry-run         # print plan, write nothing
```

## Example: refresh Athena from a local library

```powershell
# Stage from ~/.grok/skills (or any source tree)
New-Item -ItemType Directory -Force raw-skills/athena | Out-Null
Copy-Item -Recurse -Force "$env:USERPROFILE\.grok\skills\athena-js" raw-skills\athena\athena-js
pnpm run process:raw-skills -- --plugin athena
```

Then commit the updated files under `plugins/athena/` (and marketplace/index if new).
