# Contract Drift Playbook

## Contents

1. What counts as contract drift
2. Drift classes
3. Evidence order
4. Audit workflow
5. Fix ordering
6. Durable reduction patterns
7. Review questions
8. Anti-patterns

## What Counts As Contract Drift

Contract drift is any mismatch between what one surface promises and what another surface actually implements, consumes, or documents.

Common surfaces:

- CLI commands, flags, defaults, help text, env var bindings
- HTTP routes, methods, query params, headers, auth rules, status codes
- JSON request and response bodies
- SDK method signatures, generated clients, wrapper helpers
- database schemas, migrations, query assumptions, row-to-DTO mappings
- event topics, payload envelopes, retry semantics, delivery guarantees
- docs, examples, fixtures, smoke tests, snapshots
- module boundaries, crate exports, traits, feature flags

Drift is not only a type mismatch. It also includes behavior that stayed valid at compile time while becoming wrong for callers.

## Drift Classes

### Shape Drift

A field, flag, enum member, route segment, or table column changed in one place but not another.

Signals:

- compile errors in only one layer
- deserialization failures
- stale generated clients
- docs examples that no longer run

### Naming Drift

The same concept exists under multiple names without a deliberate translation boundary.

Signals:

- `user_id` in storage, `userId` in API, `uid` in SDK without an explicit mapper
- copied constants with different spellings
- multiple near-identical enums

### Behavioral Drift

The static shape stayed similar, but runtime semantics changed.

Signals:

- status codes changed
- pagination cursor behavior changed
- defaults or sorting changed
- retries or idempotency assumptions changed
- CLI command accepts the same flag but interprets it differently

### Validation Drift

Validators, parsers, or preconditions differ across layers.

Signals:

- client accepts values the server rejects
- help text says a flag is optional but the runtime errors without it
- one crate clamps or normalizes a value that another crate does not

### Lifecycle Drift

Creation, update, deletion, migration, or rollout sequencing changed in one place but not in dependents.

Signals:

- old events still emitted after a schema migration
- docs cover only create flow while update flow diverged
- compatibility shims linger after callers moved on

### Ownership Drift

Two or more places appear to define the same contract.

Signals:

- manually maintained OpenAPI plus manually maintained DTO docs
- server and SDK each define near-identical request structs
- CLI parser, config loader, and docs each encode defaults separately

Ownership drift is usually the root cause. Fixing it often removes the others.

## Evidence Order

Prefer this order when deciding what is true:

1. live runtime behavior or targeted tests exercising the runtime
2. implementation at the public seam
3. authoritative shared types or schema inputs
4. meaningful call sites
5. generated outputs
6. docs, examples, snapshots, comments

Adjust this when the repo has an explicit contract-first workflow. For example, protocol definitions or schema files may rank above implementation if code is generated from them.

## Audit Workflow

### 1. Scope the contract family

Define one family before reading everything:

- one CLI command
- one route or endpoint group
- one event family
- one crate export
- one database table to API path

If the user says "audit contract drift in this repo," start with the seam they already named or the failing artifact they pasted.

### 2. Map the authority chain

Write down:

- upstream authority
- downstream projections
- translation layers
- validation layers
- human-facing mirrors

Example chain:

`shared type -> server handler -> OpenAPI generation -> SDK generation -> README example`

Any step in that chain that requires copy-editing is a likely drift seam.

### 3. Compare promises against behavior

For each surface, extract:

- accepted inputs
- rejected inputs
- defaults
- normalization
- output shape
- ordering guarantees
- nullability
- side effects
- compatibility guarantees

This is where drift often appears even when type names match.

### 4. Record exact evidence

Keep evidence grounded in files, tests, commands, or runtime observations.

Good evidence:

- a handler returns `204` while docs say `200`
- a Clap default is `"json"` while README says `"table"`
- a crate exports `Option<String>` but downstream JSON schema marks it required
- examples send `page` while runtime only reads `cursor`

Weak evidence:

- "this feels inconsistent"
- "the naming seems odd"

### 5. Decide whether the mismatch is intentional

Not all mismatches are bugs. Ask:

- is there a documented translation boundary?
- does one layer need compatibility with older clients?
- is one surface legacy and intentionally read-only?
- is the mismatch a deliberate UX layer over a lower-level contract?

If yes, document the translation and make it explicit. If no, reduce duplication and align.

## Fix Ordering

### Fix the authority first

If the root type, parser, schema, or public implementation is wrong, correct it there first.

### Then fix projections

Update or regenerate:

- generated clients
- docs
- examples
- wrappers
- tests
- snapshots

### Then remove duplication

If two definitions mirror each other with no good reason, consolidate them.

Examples:

- derive docs or schema from shared types
- share a config/defaults struct between CLI and runtime
- move common request/response types into a lower crate
- centralize enum strings and route constants

### Finally add the guardrail

Do not stop at "now it matches." Add something that will fail next time.

## Durable Reduction Patterns

### Pattern: One canonical contract, many projections

Choose one source of truth and derive outward.

Good authorities:

- parser/command definitions for CLIs
- protocol/schema inputs for generated APIs
- shared transport/domain types for SDK and server boundaries
- migrations plus typed query models for database-facing code

### Pattern: Explicit translation boundaries

When two layers must differ, encode translation in one mapper instead of letting names drift everywhere.

Examples:

- storage snake_case to API camelCase
- internal enum to public enum
- verbose backend error to stable public error code

### Pattern: Shared defaults

Defaults drift constantly when they are repeated in:

- CLI definitions
- config loaders
- runtime builders
- docs examples
- tests

Prefer one defaults module or one config type consumed from all layers.

### Pattern: Contract tests at the seam

Write tests at the public surface, not only inside helpers.

Examples:

- invoke the CLI and snapshot help text or JSON output
- hit the HTTP handler and assert status plus body shape
- round-trip event payloads through serialization
- compare generated artifacts against checked-in outputs

### Pattern: Compatibility with an end date

If you keep a backward-compatibility shim:

- label it
- test it
- isolate it
- document the removal criteria

Shims without ownership become permanent drift factories.

## Review Questions

Use these during audits or code review:

- What is the single authority for this contract?
- Which artifacts are derived, and which are hand-maintained?
- Are two crates defining the same public concept separately?
- Would a caller, doc reader, and runtime observer describe this behavior the same way?
- Are defaults encoded once or repeated?
- If the implementation changed yesterday, what would fail today?
- Can the mismatch be eliminated by moving a shared contract lower in the dependency graph?
- Is a translation boundary explicit or accidental?

## Anti-Patterns

### Mirror Structs Everywhere

Server DTO, SDK DTO, doc DTO, and test fixture DTO all evolve independently.

Reduce by sharing or generating from one authority.

### Generated Artifacts Edited By Hand

If generated outputs need manual patching, either the generator inputs are incomplete or the ownership model is wrong.

### Docs As Competing Authority

Docs should describe the contract, not redefine it. If examples are routinely wrong, add executable or validated examples.

### Wrapper Drift

Thin wrappers around SDKs or crate exports often copy signatures and defaults, then drift quietly. Either delete the wrapper, make it meaningfully higher-level, or test it as its own public contract.

### Boundaryless Compatibility

Multiple shapes are kept alive "just in case" with no explicit version boundary. This hides real contract ownership and makes refactors harder.
