# Rust Cleanup Checklist

Run through this list during audit mode. Record pass/fail and evidence path for each item.

## Workspace structure

- [ ] `[workspace].members` matches crates that actually build
- [ ] Incubating `crates/*` not in members are labeled explicitly
- [ ] Root crate is a thin runtime shell, not a god crate
- [ ] `cargo tree` has no lower→root back-edges
- [ ] Binaries are declared intentionally (not accidental `src/main.rs` duplicates)

## Contract spine

- [ ] Each public API family has one authority location
- [ ] CLI types map from or reuse spine types
- [ ] Config/env types do not redefine spine fields independently
- [ ] HTTP handlers use spine request/response types or named mappers
- [ ] Storage row types are projections, not parallel domain definitions
- [ ] Error types are not duplicated across crates with different variants

## Defaults and validation

- [ ] Clap defaults match config/runtime defaults
- [ ] Validation rules live once (spine or shared helper)
- [ ] `serde` attributes consistent across spine and projections
- [ ] Feature-gated fields documented in one place

## Duplication and dead code

- [ ] No exact duplicate modules in legacy and new trees
- [ ] Unused `pub fn` and modules confirmed by import trace
- [ ] Copy-pasted test harnesses consolidated or shared
- [ ] `allow(dead_code)` and `#[cfg(test)]`-only production code reviewed

## Generated and derived surfaces

- [ ] OpenAPI / protobuf / MCP catalog regenerated from authority
- [ ] Committed generated files match source definitions
- [ ] Examples in README match actual CLI flags and types

## Dependencies

- [ ] Contract crates have minimal deps (no full web stack)
- [ ] No circular package dependencies in `cargo metadata`
- [ ] Optional features documented and tested in CI matrix

## Tests and CI

- [ ] Seam tests cover spine serde and validation
- [ ] `cargo fmt --check` and `clippy -D warnings` pass
- [ ] Workspace tests run with `--locked` if repo uses lockfile discipline
- [ ] New guardrail would catch reintroduced drift

## Reporting format

For each failed item, record:

```
- Item: <checklist line>
- Severity: blocker | high | medium | low
- Evidence: <path:line or cargo tree output>
- Fix: <one-line direction>
- Phase: 0–4 from refactor-phases.md
```

Rank by: `duplicate+drift` > `boundary violation` > `dead code` > `plain duplicate` > `missing guardrail`.