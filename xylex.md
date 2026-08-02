# XYLEX Group — Relational Knowledge Graph

> Master map of XYLEX Group products, CLIs, SDKs, and agent skills.
> Use `⤳ skill:` links to load deeper guidance from this repo.

---

## Legend

- **[PRODUCT]** — A XYLEX Group product or service
- **→ depends on** — Runtime or build-time dependency
- **↔ integrates with** — Bidirectional integration
- **⊂ contains** — Parent/child relationship
- **⤳ skill:** — Bundled skill for detailed guidance
- **📚 docs:** — Official documentation

---

## 1. Platform & tooling

```
XYLEX GROUP
├── Agent Skills (this repo)                    📚 docs: https://agentskills.io
│   ⊂ skills/*/SKILL.md (Agent Skills format)
│   ⤳ skill: create-xylex-skill
│
├── XBP (ops CLI: deploy, release, OCI, CF)
│   → Cloudflare Workers / Containers
│   → Native OCI registry (registry.xbp.app)
│   ↔ Linear / GitHub
│
└── Athena (auth, data, billing, storage)
    ⊂ Athena JS SDK (@xylex-group/athena)
    ⊂ Athena Auth / Auth UI
    ⊂ Athena Billing / Storage
    ↔ Cloudflare D1 / R2 edge adapters
```

---

## 2. Skill authoring

| Concern | Guidance |
| ------- | -------- |
| New skill layout | ⤳ skill: create-xylex-skill |
| Frontmatter contract | See README “SKILL.md format” |
| Agent Skills standard | 📚 https://agentskills.io/specification |

---

## 3. Adding skills

1. Create `skills/<name>/SKILL.md` with YAML frontmatter between `---` fences.
2. Add a `⤳ skill: <name>` reference in the relevant section of this file.
3. Run `bun run validate` (use `--coverage skip` when offline).
