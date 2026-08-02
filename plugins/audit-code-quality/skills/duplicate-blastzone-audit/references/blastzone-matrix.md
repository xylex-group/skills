# Blast Zone Matrix

A **blast zone** is everything that changes behavior, breaks compile, or loses coverage when you merge or delete a duplicate function.

## Blast tiers

Trace each tier for every symbol in a cluster:

| Tier | What to trace | Evidence |
|------|---------------|----------|
| **T0 Definition** | Function body, types used | `path:line` of each copy |
| **T1 Direct callers** | Functions/modules invoking symbol | `rg "symbol\("` excluding definition |
| **T2 Entry surfaces** | Routes, commands, handlers, workers reaching T1 | Import chain from `main` / router / CLI |
| **T3 Tests** | Unit, integration, e2e referencing symbol | `rg` under `tests/`, `__tests__/`, `spec/` |
| **T4 Generated** | OpenAPI, SDK, MCP catalog, protobuf | Regen inputs and committed outputs |
| **T5 Docs** | README, examples, doc comments | `rg` in `docs/`, `*.md`, rustdoc links |

## Blast zone size labels

| Label | Typical signals |
|-------|-----------------|
| **Narrow** | T1 ≤ 3 files, no T2 public API, tests colocated |
| **Medium** | T1 4–10 files or single package surface |
| **Wide** | T1 10+ files, multiple packages, or T2 public exports |
| **Critical** | Auth/payment/startup in T2, or T4 generation chain |

## Choke points

Flag a cluster as a **choke point** when:

- Many unrelated features call the same duplicate helper
- Merging requires agreeing on policy buried in one copy
- Terminology overload: same name, different semantics in different packages
- Local fork shadows installed package export

Choke points raise **risk** and often lower immediate **yield** (harder merge) but increase long-term payoff — stage them, do not skip.

## Caller trace recipe

```powershell
# 1. Direct references (adjust symbol)
rg -n "\bresolve_session\s*\(" --glob "!target/def/file.rs"

# 2. Import bindings
rg -n "use\s+.*resolve_session|resolve_session\s*," .

# 3. Re-exports
rg -n "pub\s+use\s+.*resolve_session" .

# 4. Test-only?
rg -l "resolve_session" tests/ crates/*/tests/
```

For TypeScript/JavaScript:

```powershell
rg -n "resolveSession\s*\(" --glob "!**/node_modules/**"
rg -n "from\s+['\"].*session|import\s*\{[^}]*resolveSession" .
```

## Canonical selection heuristics

Prefer as canonical:

1. Symbol on the **live runtime seam** (T2 path matches production entry)
2. Copy with **most complete tests** (T3)
3. Copy in **lower layer** (shared util vs page-specific wrapper)
4. **Published package** export over local fork (when package is source of truth)

Avoid canonical:

- Copy only used in legacy route still shipped but not main path
- Copy in test fixtures unless promoting fixture to production helper
- Copy with hidden env-specific side effects not documented elsewhere

## Blast zone in reports

Per cluster, report:

```
Blast zone: Wide
T1 callers: 14 files (list top 5 + count)
T2 surfaces: POST /api/session, xbp secrets resolve, worker bootstrap
T3 tests: 3 files, 1 missing for copy B
T4 generated: crates/mcp/generated/catalog.json (stale risk)
T5 docs: README § secrets (mentions old helper)
```

## Deletion safety gate

Do **not** delete a duplicate until:

- [ ] All T1 callers repointed or removed
- [ ] T2 surfaces manually smoke-checked or covered by tests
- [ ] T3 tests run on canonical path
- [ ] T4 regenerated if applicable
- [ ] T5 updated or ticket filed