# Rust Crate Patterns For Contract Drift

## Contents

1. Rust contract ownership
2. Good crate layouts
3. Drift hotspots in Rust codebases
4. Reduction patterns
5. Validation patterns
6. Review heuristics

## Rust Contract Ownership

Rust projects often drift because the same contract is redefined in multiple layers:

- CLI parser types
- config types
- transport DTOs
- storage row structs
- SDK request and response structs
- docs examples
- test fixtures

Prefer one lower-level contract crate or module per contract family, with higher layers translating explicitly only when semantics truly differ.

Good ownership direction:

- core/shared contract crate defines stable transport or domain shapes
- feature crate implements business behavior around those shapes
- adapter crates handle protocol-specific translation
- runtime crate wires config, environment, router, jobs, and process startup

If a lower crate imports runtime-only app state, the contract boundary is probably upside down.

## Good Crate Layouts

### Shared Contract Crate

Useful when multiple crates need the same public shapes, enums, or error codes.

Good contents:

- public request and response types
- enums with serialized values
- contract-level validation helpers
- route or command constants when truly shared

Avoid putting runtime wiring or framework state here.

### Adapter Crate

Useful when the same core contract is exposed via multiple protocols.

Good contents:

- mappers
- serializer helpers
- API-specific envelopes
- conversion layers from domain to transport

This is the right place for intentional differences, not for silent duplication.

### Runtime Shell

Keep these near the top:

- env loading
- CLI entrypoint wiring
- HTTP router setup
- database pools
- worker spawning
- feature-flag resolution

Do not let runtime shells become the only place where defaults or public behavior are knowable.

## Drift Hotspots In Rust Codebases

### Parallel DTO Families

Different crates define near-identical structs for the same payload:

- `CreateUserRequest` in API crate
- `CreateUserInput` in service crate
- `CreateUserBody` in SDK crate

This is fine only if each type owns a real translation boundary. If fields and semantics match exactly, consolidate.

### Clap Versus Runtime Defaults

CLI help often drifts because defaults are duplicated in:

- `#[arg(default_value = ...)]`
- runtime config builder
- env loader
- README examples

Prefer one defaults seam and make the parser reflect it.

### Serde Shape Drift

Risks:

- renamed fields
- missing `default`
- optional versus omitted semantics
- enum rename rules
- flattening or tagging changes

Round-trip tests and JSON snapshots catch these early.

### Feature-Flag Drift

Different crates compile different surfaces, but docs and tests only cover one feature set. Public contracts should either be feature-stable or explicitly documented per feature.

### Trait Contract Drift

Trait methods keep the same type signatures while semantic guarantees drift.

Examples:

- timeout expectations changed
- returned ordering changed
- "not found" changed from `None` to error
- side effects moved earlier or later

When traits represent public seams between crates, document and test behavior, not only types.

## Reduction Patterns

### Move Shared Contracts Downward

If two upper crates need the same public shape, move it into a lower crate they both depend on.

Good targets:

- `crates/contracts`
- `crates/api-types`
- `crates/domain-types`

The exact name matters less than the dependency direction.

### Use Explicit Conversions For Real Boundary Changes

If storage, domain, API, and SDK semantics differ, make conversion code obvious:

- `From` and `TryFrom`
- named mapper functions
- adapter modules with focused tests

Do not encode the same translation repeatedly at call sites.

### Centralize Public Constants

Shared strings drift easily:

- route names
- event topics
- error codes
- CLI output modes

If callers depend on them, centralize them.

### Generate From Existing Types Where The Repo Already Supports It

If the codebase already uses schema or client generation, strengthen that path instead of inventing manual mirrors. The reduction move is usually to improve the generator inputs, not to patch generated outputs.

### Keep Compatibility Shims Thin

During refactors:

- re-export old types briefly
- forward old commands to new implementations
- isolate versioned payloads

Do not let the shim become the new authority.

## Validation Patterns

Use focused checks close to the contract:

- `cargo check -p <crate>` for each touched authority crate
- endpoint or command tests at public seams
- serialization round-trip tests
- snapshot tests for CLI help or JSON output
- generated-artifact freshness checks
- compile tests for public example snippets when feasible

In workspace audits, also inspect:

- `cargo metadata --format-version 1`
- `cargo tree -p <crate> --edges normal`

These help confirm whether the contract ownership really flows the way the skill expects.

## Review Heuristics

Ask:

- Which crate should own this public concept?
- Why is this type duplicated here?
- Is a higher crate redefining something a lower crate could expose?
- Are CLI defaults and runtime defaults defined once?
- Are serde tags, docs examples, and SDK expectations aligned?
- Is a trait contract tested behaviorally or only type-checked?
