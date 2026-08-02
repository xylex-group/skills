# Shrink without losing UI or function

Invariant for every consolidation:

> **Same public surface, fewer implementations.**  
> Do not remove field types, presentation modes, routes, ports, or user-visible flows.  
> Collapse *how* they are implemented, not *that* they exist.

## Ranking for “safe shrink”

Prefer (high → low):

1. **Duplicate + drift** on live seams (submit, publish, field registry/render)
2. **Hand-maintained twins of a registry** (palette lists, SPEC field lists, seed duplicates)
3. **Fat adapters** (HTTP routes / demo app reimplementing domain)
4. **Table-driveable switches** (command maps, dispatch maps, render maps)
5. **God modules** that only need file-split (no behavior change)
6. **Generated artifacts treated as source** (seed JSON, docs field catalogs)
7. Pure dead exports with import proof
8. Style-only hygiene (only if free with adjacent work)

Reject or drop:

- Deleting a field type “nobody uses” without product sign-off
- Merging two UX modes that differ intentionally
- “Simplify” by removing error paths, analytics events, or ports
- Micro-hooks / one-line wrapper files that increase file count with no drift kill

## Cross-repo patterns (encode in explore)

### 1. Single source of truth for catalogs

| Smell | Consolidation |
|-------|----------------|
| Hand list of field types next to registry | Derive palette / docs / SPEC from `ALL_FIELD_TYPES` or registry |
| Defaults file parallel to definitions | `createDefault` only on definition objects |
| Seed script + committed large seed JSON both hand-edited | Script is writer; JSON is build artifact |

### 2. Application use cases behind adapters

| Smell | Consolidation |
|-------|----------------|
| Next/Express route contains validation + persistence orchestration | `publishForm` / `acceptX` in core; route = parse → use-case → HTTP map |
| Same JSON error mapping in every route | `toHttp(result)` helper once |
| Dual-write (memory hack + athena path) in the route | One port method; adapters own semantics |

### 3. Table-driven domain

| Smell | Consolidation |
|-------|----------------|
| Giant `switch (command.type)` / `switch (action.type)` | Handler map `Record<Type, Handler>` |
| Per-field render switch growing forever | Render registry keyed by type (keep UI) |
| Copy-pasted validate/normalize per type | Shared helpers + definition hooks only where unique |

### 4. Adapter parity without twin bugs

| Smell | Consolidation |
|-------|----------------|
| Memory publish ≠ Athena publish on form row | Shared test matrix + one publish contract |
| Athena path falls back to memory for half the ports | `createXPlatformPorts` composes real adapters |
| Mappers duplicated field-by-field | Row ↔ domain functions shared |

### 5. UI shell split (LOC locality, zero UX change)

| Smell | Consolidation |
|-------|----------------|
| Builder shell 500+ lines with 4 inspectors inline | Sibling modules: palette, inspectors, styles — **same props, same UI** |
| Repeated inline style objects | Shared `builderStyles` / theme tokens |
| Page wrappers that only re-fetch + track | Shared `loadPublishedFormBySlug` + thin pages |

### 6. Docs / codegen

| Smell | Consolidation |
|-------|----------------|
| `SPEC.yaml` field_types hand-synced with code | Generate section from registry or test that they match |
| Long custom YAML parser only for one file | Prefer JSON/YAML dependency already in monorepo, or generate JSON from TS |

### 7. Test harness (optional shrink of *test* surface)

Shared fixtures (`makeContactForm()`) reduce repeated setup. Prefer product shrink first; do not delete coverage.

## forms-builder residual checklist (post-2026-07-31 run)

Still high value, **no feature removal**:

1. **BuilderShell split** — `FieldInspector` / `FormInspector` / `LogicInspector` / `ThemeInspector` / styles → siblings (~600 lines → ~200 shell + modules). UI identical.
2. **form-commands + form-controller handler maps** — replace large switches with maps; same command/action set.
3. **Seed SSOT** — `tooling/db/seed.ts` writes `apps/web/data/demo-seed.json`; stop dual hand-edit.
4. **SPEC field_types ↔ `ALL_FIELD_TYPES`** — test or generate; delete hand drift.
5. **HTTP result helper** — thin routes share status/body mapping from `UseCaseResult`.
6. **field-renderers further table-drive** — remaining special cases only; keep every type renderable.
7. **memory/athena CRUD boilerplate** — shared in-memory map helpers / query helpers if still repeated.
8. **generate-docs YAML parser** — if still custom and large, reduce or replace without changing page set.
9. **Dashboard repeated card chrome** — tiny presentational helper only if it removes real duplication (don’t invent a design system).
10. **Ports index size** — types only; don’t split for fashion.

## Explicit non-goals

- Removing conversational / multi-step / embed / survey modes
- Removing Athena path or memory demo path (both are adapters)
- Removing field types to “make registry smaller”
- Rewriting React to another UI library
- One giant file “because fewer files”

## Agent output language

When filing a cluster, plan must state:

- **Preserved surface**: what user/API still gets  
- **Deleted implementation**: what code goes away  
- **Proof**: test or import evidence that behavior is unchanged  
