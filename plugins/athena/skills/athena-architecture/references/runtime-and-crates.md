# Athena Runtime And Crate Map

## Core entrypoints

Root package:

- `src/main.rs`
- owns HTTP API startup, CLI dispatch, middleware wiring, and inline worker startup when daemon ownership is off

Runtime helpers:

- `src/runtime/*.rs`
- owns process bootstrap helpers and worker-runtime spawning helpers for the root package

Daemon package:

- `crates/athena-daemon/src/lib.rs`
- `crates/athena-daemon/src/main.rs`
- owns daemon and worker binaries

## Workspace crate routing hints

If the user mentions managed hostnames such as `athena-cluster.com` or `*.v3.athena-cluster.com`:

- start at `crates/athena-dns/src/lib.rs`

If the user mentions `provision.sql`, provider-backed instance creation, target preparation, or SQL statement splitting:

- start at `crates/athena-provisioning/src/sql.rs`
- then inspect the rest of `crates/athena-provisioning/src/*`

If the user mentions `resource_id`, schema-derived identifier fallback, or portable gateway request contracts:

- start at `crates/athena-gateway/src/resource_id.rs`

If the user mentions daemon ownership, clone execution, deferred workers, or split runtime binaries:

- start at `docs/architecture_deployment_and_runtime.md`
- then inspect `src/runtime/*.rs`
- then inspect `crates/athena-daemon/src/*`

If the user mentions registry loading, pool reuse, or `AppState`:

- start at `docs/architecture_client_registry_and_pooling.md`
- then inspect `src/bootstrap/mod.rs`, `src/api/client_context.rs`, and `src/lib.rs`

If the user mentions `/storage/*` or managed file catalogs:

- switch to the `athena-storage` skill

## Layering rules

Portable contracts and subsystem logic:

- prefer workspace crates under `crates/`

Actix transport glue and request envelopes:

- prefer `src/api/**`

Bootstrap and runtime wiring:

- prefer `src/main.rs`, `src/bootstrap/**`, and `src/runtime/**`

Repo-owned SQL and clean-install schema:

- prefer `sql/**`

## High-signal docs

Narrative boot and request flow:

- `docs/architecture_internals_end_to_end.md`

Deployment and runtime ownership:

- `docs/architecture_deployment_and_runtime.md`

Client registry and pooling:

- `docs/architecture_client_registry_and_pooling.md`

Overview and taxonomy:

- `docs/architecture_overview.md`

## Validation hints

Route contract changed:

- use focused root tests such as `tests/openapi.rs`

Config, DNS, or provisioning crate changed:

- prefer `cargo test -p athena-dns` or `cargo test -p athena-provisioning`

Daemon runtime changed:

- prefer `cargo test -p athena-daemon`

Cross-cutting root-package change:

- use `cargo test --lib --bins --tests`
