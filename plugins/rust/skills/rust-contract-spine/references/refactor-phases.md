# Refactor Phases

Use this template for every non-trivial Rust cleanup. Do not start mass file moves without exit criteria.

## Phase 0 — Inventory (read-only)

**Goal:** Understand current authority and drift without changing code.

**Actions:**
- Map workspace members and incubating crates
- Build contract matrix for top seams
- Cluster duplicates and dead candidates
- Record back-edges in `cargo tree`

**Exit criteria:**
- Written contract matrix or ranked finding list
- User agrees on target seam(s) and scope boundary
- No code changes yet (except optional `rg`/metadata scripts)

---

## Phase 1 — Spine bootstrap

**Goal:** Establish or designate the contract authority.

**Actions:**
- Create `crates/<project>-contracts` or consolidate into existing foundation crate
- Move shared types, errors, validation, and default helpers
- Keep crate free of framework and runtime deps
- Add `Cargo.toml` with minimal dependency set

**Exit criteria:**
- `cargo check -p <contract-crate>` passes
- At least one contract family fully owned by spine
- Dependents identified but not yet migrated

---

## Phase 2 — Align surfaces

**Goal:** CLI, config, HTTP, storage, and tests consume the spine.

**Actions:**
- Replace duplicate structs with imports or explicit mappers
- Unify defaults through spine helpers
- Update test fixtures to use spine types
- Regenerate downstream artifacts (OpenAPI, MCP catalog, SDK) if applicable

**Exit criteria:**
- No exact duplicate of moved types in aligned crates
- `cargo check` and targeted tests pass for touched crates
- Mappers documented where semantics differ

---

## Phase 3 — Prune

**Goal:** Remove dead code and obsolete compatibility layers.

**Actions:**
- Delete unused modules confirmed by import tracing
- Remove thin re-export-only modules that add no value
- Collapse incubation crates into workspace or delete
- Drop redundant `pub use` chains

**Exit criteria:**
- Deleted paths verified unused (`rg`, `cargo check` workspace)
- Line-count reduction noted in summary
- No broken public API without deprecation plan

---

## Phase 4 — Guard

**Goal:** Prevent the same drift from returning.

**Actions:**
- Add seam tests (serde round-trip, CLI default parity, handler validation)
- Add CI checks: fmt, clippy, generation diff, `cargo test --locked`
- Document translation boundaries in code or ADR if non-obvious

**Exit criteria:**
- At least one automated check would fail if drift reintroduced
- CI-equivalent commands pass locally

---

## Phase sizing guide

| Workspace size | Suggested slice |
|----------------|-----------------|
| Single crate | Phases 0–2 in one PR; spine = `src/contracts/` module |
| 2–5 members | One contract family per PR through phase 2 |
| 6+ members | One crate boundary per PR; spine bootstrap first |

## PR / commit discipline

- One phase or one contract family per PR when possible
- Each PR: `cargo fmt`, `cargo clippy`, `cargo test` for touched crates
- PR description states: authority change, dependents updated, guardrail added
- Avoid mixing spine work with unrelated feature work

## Rollback plan

Before phase 2+:

- Note which crates depended on old types
- Keep thin `pub use` facades at old paths for one release if needed
- Prefer feature flags only when the repo already uses them for migrations