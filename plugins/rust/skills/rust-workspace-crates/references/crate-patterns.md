# Crate Patterns

## Contents

- Taxonomy
- Suggested Layout
- Planning Template
- Migration Checklist
- Anti-Patterns

## Taxonomy

Use these roles when proposing a crate graph:

- `foundation`: pure contracts, error types, builders, planners, algorithms, worker loops
- `adapter`: reusable protocol or transport normalization
- `feature`: bounded domain logic with storage and runtime ports
- `runtime`: binaries, app shells, router wiring, config loading, process startup
- `incubation`: extracted code not yet active in the workspace

Prefer lower crates that can compile without:

- web frameworks
- global app state
- config-file parsing
- process bootstrap
- route registration

## Suggested Layout

```text
repo/
|- Cargo.toml
|- src/
|  |- lib.rs
|  |- main.rs
|  `- feature_facade.rs
|- crates/
|  |- query-core/
|  |  |- Cargo.toml
|  |  `- src/lib.rs
|  |- gateway-contracts/
|  |  |- Cargo.toml
|  |  `- src/lib.rs
|  |- worker-runtime/
|  |  |- Cargo.toml
|  |  `- src/lib.rs
|  `- feature-domain/
|     |- Cargo.toml
|     `- src/lib.rs
`- tests/
```

Keep the root crate thin:

- load config and env
- build shared state
- mount routers
- implement runtime traits
- spawn workers

Use root compatibility modules when needed:

- `src/feature_facade.rs` re-exports the extracted crate
- keep them temporary and thin

## Planning Template

Before moving code, write down:

1. Current seam:
   - which files are too large, repeated, or mixed
2. Proposed crates:
   - crate name
   - role
   - public surface
3. Dependency direction:
   - what each crate may depend on
   - what it must not depend on
4. Runtime ports:
   - traits needed for pools, HTTP, registries, sinks, or writes
5. Migration strategy:
   - direct move
   - root facade
   - staged extraction

## Migration Checklist

1. Create `crates/<name>/Cargo.toml`.
2. Move portable modules first.
3. Add traits where the moved code still needs runtime access.
4. Replace direct framework usage in the extracted crate.
5. Add the crate to `[workspace].members` only when active.
6. Add root re-exports only where they reduce churn.
7. Run `cargo metadata --format-version 1`.
8. Run `cargo check -p <new-crate>`.
9. Run `cargo check -p <runtime-crate>`.
10. Inspect `cargo tree` if dependencies look suspicious.

## Anti-Patterns

Avoid these patterns:

- extracting a crate that still imports the root app crate
- putting route handlers and `AppState`-style globals into a supposedly reusable crate
- creating a new crate for every folder instead of for real boundaries
- hiding inactive crate status when code under `crates/*` is not an active workspace member
- moving code before deciding the dependency DAG
- leaving compatibility facades that quietly fork logic instead of re-exporting it

When you find a back-edge from a lower crate to the root crate, describe it plainly:

- call it partial extraction
- keep the crate role narrow
- propose the next trait or port that would remove the back-edge
