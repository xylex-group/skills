# CI Guardrails

## Contents

1. Goal
2. Guardrail types
3. Generation rules
4. Example validation seams
5. Pull request prompts

## Goal

Make drift visible early enough that a routine change cannot silently desynchronize a public contract from its dependents.

## Guardrail Types

### Contract Tests

Test the public seam directly:

- invoke the CLI
- hit the handler
- serialize the payload
- call the SDK wrapper
- run the changed SQL path

These catch behavioral drift that compile checks miss.

### Artifact Freshness Checks

Fail if checked-in generated outputs are stale.

Typical targets:

- generated clients
- schemas
- OpenAPI outputs
- snapshots
- help text captures

If the artifact is worth checking in, it is worth validating for freshness.

### Example Execution

Executable examples reduce doc drift. Good options:

- doctests
- integration test snippets
- smoke scripts that run example commands
- JSON fixtures exercised in tests

### Ownership Checks

Detect duplicated contract definitions or suspicious layering.

Examples:

- grep or lint for copied route constants
- workspace checks for lower crates importing runtime crates
- scans for parallel DTO names across crates

### Diff Review Checks

When contract-heavy files change, review the adjacent projections too.

Examples:

- parser definitions changed: check help docs and examples
- API types changed: check SDK or generated schema
- migration changed: check query assumptions and public nullability

## Generation Rules

Prefer these rules:

1. edit the authority
2. regenerate projections
3. validate no extra diff remains

Avoid:

1. patch generated output
2. forget generator inputs
3. leave the repo in a state where the next generation reverses the fix

If the project cannot regenerate automatically yet, state that explicitly and consider adding a scaffold command or documented workflow.

## Example Validation Seams

Use the closest seam that exercises the contract:

- CLI: help snapshot, parser integration test, real process invocation
- HTTP API: request/response integration test, schema comparison
- SDK: generated artifact diff check, wrapper integration test
- DB: focused migration plus query test
- events: producer-consumer round-trip test
- Rust workspace: per-crate `cargo check` plus seam-level tests

## Pull Request Prompts

Use these prompts during review:

- What contract changed here?
- Where is that contract authoritative?
- What downstream artifacts or examples should also change?
- What test would fail if this drifted again next month?
- Did this PR update the source of truth or only one projection?
