---
name: update-skill
description: >
  Rebuild or refresh a Grok skill from a live library/package tree by inventorying
  package.json exports, types, components, hooks, examples, tests, and docs, then
  writing SKILL.md + references. AUTO-RUN the global workflow update-skill when the
  user asks to update a skill from source, refresh a skill from packages/*,
  /update-skill, or "update skill X from library Y". Pass skill_name, library_root,
  optional focus/include_globs/examples/skill_scope/dry_run.
---

# Update Skill

When the user wants a skill rewritten from real package contents, **immediately**
launch the global workflow (do not only plan):

```text
workflow name=update-skill
args = {
  "skill_name": "<name>",
  "library_root": "<packages/... path>",
  "focus": "<optional free text>",
  "include_globs": "<optional comma list>",
  "examples": "<optional comma-separated example roots>",
  "skill_scope": "user" | "project",
  "related_skills": "<optional comma list>",
  "dry_run": false,
  "mirror_plugin": true
}
agent_budget: 48
```

## Required args

| Arg | Meaning |
| --- | --- |
| `skill_name` | Skill folder name, e.g. `athena-auth-ui-tables` |
| `library_root` | Package root with `package.json` / `src` |

## Optional args

| Arg | Default | Meaning |
| --- | --- | --- |
| `focus` | "" | What to emphasize (AthenaTables, chips, …) |
| `include_globs` | "" | Path/symbol filters |
| `examples` | "" | Example app roots to walk |
| `skill_scope` | `user` | `user` → `~/.grok/skills/<name>`; `project` → `.grok/skills/<name>` |
| `related_skills` | "" | Sibling skills to link |
| `dry_run` | false | Inventory + plan only |
| `mirror_plugin` | true | Copy into installed-plugins athena skill if present |

## Workflow phases

1. **Scope** — skill dir, package exports, existing skill files  
2. **Inventory** (parallel) — exports · types/components · examples · tests/docs  
3. **Structure** — description + outline + reference plan  
4. **Write** — SKILL.md + references  
5. **Verify** — read-back checklist; optional plugin mirror  

Tell the user the run is in `/workflows`. On completion report `skill_dir`,
files written, verify summary, and slash command `/<skill_name>`.

## Exceptions

- User says dry run / plan only → `"dry_run": true`
- User wants only one reference file edited manually → do not launch workflow;
  edit the skill directly
