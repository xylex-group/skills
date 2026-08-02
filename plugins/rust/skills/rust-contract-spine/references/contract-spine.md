# Contract Spine Anatomy

## What a contract spine is

A **contract spine** is the single downward authority chain for public shapes in a Rust workspace:

```
                    ┌─────────────┐
                    │   runtime   │  binaries, main, router, pools, spawn
                    └──────┬──────┘
                           │ wires + implements traits
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   cli    │ │  http    │ │  worker  │  transport adapters
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │ imports or maps
                          ▼
                   ┌─────────────┐
                   │   feature   │  domain logic, storage traits
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  contract   │  types, errors, validation, constants
                   │   (spine)   │
                   └─────────────┘
```

The spine crate (or module family) owns:

- request/response and command payload types
- shared enums and error codes
- serialized field names and validation rules
- default values when they are part of the public contract
- route/command identifiers when truly shared

Higher layers either **use spine types directly** or **map through named translators** when semantics differ.

## Crate roles

| Role | Owns | Must not own |
|------|------|--------------|
| **contract** | `FooRequest`, `ApiError`, shared `const` defaults | actix/axum state, DB pools, env |
| **feature** | services, planners, storage traits | duplicate `FooRequest` |
| **adapter** | protocol envelopes, mappers | business rules |
| **runtime** | `main`, config load, router, trait impls | sole copy of public defaults |
| **incubation** | extracted but not yet a workspace member | implied production status |

## Good spine signals

- `cargo tree` shows contract crate as a leaf or near-leaf depended on by many crates
- CLI `#[command]` and HTTP handlers take or map from the same `FooRequest`
- Defaults come from one function or `const` re-exported by the parser
- Tests construct fixtures from spine types, not hand-rolled parallel structs
- OpenAPI/SDK/catalog generation reads from the same definitions

## Anti-patterns (treat as refactor targets)

| Pattern | Why it drifts |
|---------|---------------|
| Root `src/` still owns domain types after `crates/*` exists | spine never moved |
| Lower crate imports `xbp_cli::AppState` | boundary upside down |
| Three structs, same fields, no mapper | silent duplication |
| `default_value` only in clap, not in config builder | dual authority |
| `pub use` re-export chains three crates deep | ownership unclear |
| Feature crate defines HTTP DTOs | transport leaked into domain |

## Translation boundaries (intentional, not drift)

Document these explicitly in the plan:

- **CLI flattening** — `foo.bar` flag maps to nested `FooRequest { bar: ... }`
- **Storage projection** — row struct adds DB-only columns (`id`, `created_at`)
- **External SDK** — third-party shape wrapped, not mirrored field-for-field
- **Versioned API** — `v1::CreateUser` vs `v2::CreateUser` with explicit migration mapper

Each boundary gets a named function or module: `cli_to_request`, `row_to_domain`, `v1_to_v2`.

## Bootstrap sequence

When implementing a spine from scratch or recovering from drift:

1. **Name the contract families** — one spine module or crate per family, not per folder
2. **Move stable types first** — enums, errors, request bodies with few deps
3. **Introduce defaults seam** — `fn default_timeout() -> u64` used by clap and config
4. **Point dependents** — replace local structs with `use contract::FooRequest` or mappers
5. **Delete mirrors** — remove structs that became redundant
6. **Add spine tests** — serde round-trip, validation, default parity

## Naming conventions

Keep spine names stable and surface-agnostic:

- Prefer `CreateProjectRequest` over `CreateProjectBody` or `CreateProjectInput`
- Prefer `ProjectError` with codes over ad-hoc `String` errors in multiple crates
- Suffix only when semantics differ: `CreateProjectRequest` (API) vs `CreateProjectRow` (DB projection)