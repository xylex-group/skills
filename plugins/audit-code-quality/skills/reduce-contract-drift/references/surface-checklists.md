# Surface Checklists

## Contents

1. CLI contracts
2. HTTP API contracts
3. SDK and generated client contracts
4. Database and storage contracts
5. Event and async contracts
6. Docs, examples, and test contracts

## CLI Contracts

Check:

- command names, subcommands, aliases
- flag names, short flags, env var bindings
- required versus optional flags
- default values and default-value docs
- accepted value formats and validators
- output modes, exit codes, stderr/stdout behavior
- help text, examples, shell completion, manpage generation
- config file precedence versus CLI precedence

Common drift seams:

- parser definitions changed but docs/examples did not
- env var fallback exists in code but not in help text
- default is set in the runtime, not in the parser, so help lies
- wrapper command forwards stale flag names

Reduction moves:

- define defaults once and reuse
- snapshot help output for important commands
- test a real process invocation, not only parser helpers
- centralize flag-to-config translation

## HTTP API Contracts

Check:

- route path and HTTP method
- auth requirements
- query and path parameter names
- request body requiredness and nullability
- response status codes
- error envelope shape
- pagination semantics
- sort and filter defaults
- compatibility promises and versioning behavior

Common drift seams:

- handler behavior changed without spec or SDK updates
- docs say `page`, runtime reads `cursor`
- nullable field became omitted or vice versa
- server emits a new error code that clients do not understand

Reduction moves:

- derive specs from real handler types where the repo supports it
- add endpoint-level contract tests
- keep error-code registries centralized
- execute docs examples or curl smoke tests

## SDK And Generated Client Contracts

Check:

- method names and argument ordering
- optional versus required fields
- enum casing and serialized values
- auth and base URL assumptions
- retries, timeouts, and idempotency helpers
- error mapping
- generated model freshness
- wrapper method docs and examples

Common drift seams:

- generator input changed but generated client was not refreshed
- SDK wrapper copied server types and drifted
- examples target deprecated method names
- serialization tags differ from public docs

Reduction moves:

- generate instead of mirroring by hand
- if wrappers remain, test them as first-class public seams
- add stale-generated-artifact checks in CI
- keep example snippets under test where practical

## Database And Storage Contracts

Check:

- migrations versus current model definitions
- query assumptions about nullable columns
- column naming and transport naming
- enum/text values persisted versus returned publicly
- uniqueness and foreign-key assumptions
- pagination keys and ordering stability
- data backfill and migration compatibility

Common drift seams:

- API still assumes old column names or nullability
- model derives updated but SQL or migrations did not
- multiple crates define row shapes differently
- docs describe states that storage can no longer represent

Reduction moves:

- keep migration files authoritative for storage shape
- share row/domain conversion logic instead of repeating it
- add focused tests over changed queries and serializers
- document intentional storage-to-public translations once

## Event And Async Contracts

Check:

- topic names and routing keys
- payload envelope shape
- version fields and compatibility rules
- ordering guarantees
- retry and dedupe expectations
- dead-letter or tombstone behavior
- producer and consumer assumptions

Common drift seams:

- producer adds a field but consumer fixtures lag
- event ordering assumptions changed
- internal retry semantics changed but public guarantees were not revisited
- multiple services serialize the same event family differently

Reduction moves:

- share event definitions or schema inputs
- round-trip serialize and deserialize in tests
- version events explicitly when compatibility matters
- keep one mapper from internal domain to event envelope

## Docs, Examples, And Test Contracts

Check:

- README commands and curl examples
- sample JSON payloads
- fixture names and field spellings
- snapshot freshness
- comments that promise behavior
- runbook/operator assumptions

Common drift seams:

- tests exercise internals while docs promise something else
- fixtures lag after a rename
- examples are hand-maintained and never executed
- comments became authority-by-accident

Reduction moves:

- prefer executable examples
- fail CI when generated docs or snapshots drift
- keep examples near the tested seam
- delete comments that restate unstable behavior without validation
