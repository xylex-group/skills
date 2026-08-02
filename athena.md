# Athena Ecosystem Relational Knowledge Graph

> Master reference for the Athena repository, runtime, SDKs, applications,
> authentication system, documentation, and developer tooling.
>
> Repository: https://github.com/xylex-group/athena
> Documentation: https://docs.athena-cluster.com

## Scope and notation

- `[RUNTIME]` - deployable server or service
- `[APP]` - deployable application or operator surface
- `[PACKAGE]` - publishable package or CLI
- `[WORKSPACE]` - repository-local package or crate workspace
- `-> depends on` - build-time or runtime dependency
- `<-> integrates with` - bidirectional integration
- `contains` - parent workspace relationship
- `publishes as` - npm or other public package identity
- `source of truth` - authoritative source for generated output

## 1. Athena platform

```text
ATHENA PLATFORM [RUNTIME]
Repository: xylex-group/athena
Documentation: https://docs.athena-cluster.com
|
|-- Athena RS gateway and runtime [RUNTIME]
|   Path: ./
|   Crate: athena_rs
|   Binary: athena_rs
|   Current repository version: 4.1.3
|   -> PostgreSQL and direct SQL-driver paths
|   -> Supabase-compatible access
|   -> Cloudflare D1 worker-proxy access
|   -> Scylla support
|   -> AWS S3, S3-compatible, and Cloudflare R2 storage
|   -> CRUD, SQL, RPC, REST-compatible gateway APIs
|   -> API keys, schema management, provisioning, clients, and routes
|   -> backups, restore jobs, schedules, workers, and health checks
|   -> WebSocket and CDC transports
|   -> billing, webhooks, metrics, observability, and audit logging
|   -> OpenAPI contracts: openapi.yaml and openapi-wss.yaml
|
|-- Athena Auth [RUNTIME]
|   Path: services/athena-auth
|   Crate: athena-auth
|   Current repository version: 1.14.4
|   -> authentication and session management
|   -> organizations and multitenancy
|   -> API keys, OAuth-compatible accounts, passkeys, and two-factor flows
|   -> email and SMTP flows
|   -> PostgreSQL persistence through Athena Auth Core
|   -> Redis caching, metrics, structured logs, Loki, and Grafana integration
|   -> HTTP server binary: server
|   -> Auth OpenAPI contract: services/athena-auth/athena-auth.yaml
|   -> Cloudflare Worker and Cloudflare Container deployment path
|
|-- Athena Studio [APP]
|   Path: apps/web
|   Package: athena-studio
|   Production surface: studio.athena-cluster.com
|   -> browser-based operator console
|   -> administration, schema, storage, provisioning, and runtime management
|   -> authentication and organization management
|   -> observability, data inspection, query, and developer tools
|   -> Monaco editor, React Flow, charts, React Query, and Athena SDK
|   -> Next.js -> OpenNext -> Cloudflare Workers
|
|-- Athena documentation [APP]
|   Path: apps/docs
|   Package: athena-docs
|   Production surface: docs.athena-cluster.com
|   -> Fumadocs and Next.js documentation site
|   -> hand-written guides and generated API reference
|   -> Athena RS and Auth OpenAPI pages
|   -> generated crate, route, contract, and audit-logging references
|   -> curated Athena.js and create-athena-app documentation
|   -> search index, metadata, llms-full, and link validation
|   -> Next.js -> OpenNext -> Cloudflare Workers
```

## 2. Repository and workspace map

```text
xylex-group/athena
|
|-- ./                                  Root Athena RS workspace
|   |-- src/                             Gateway and runtime implementation
|   |-- crates/                          Rust workspace crates
|   |-- sql/                             Provisioning and migration SQL
|   |-- docs/                            Repository architecture documentation
|   |-- examples/                        Rust examples
|   |-- benches/                         Performance and gateway benches
|   |-- tests/                           Compatibility and integration tests
|   |-- openapi.yaml                     HTTP contract
|   |-- openapi-wss.yaml                 WebSocket contract
|   `-- routes.md                        Route inventory
|
|-- services/athena-auth/               Nested authentication workspace
|   |-- crates/core                      Auth core and domain logic
|   |-- crates/api                       Auth HTTP/API surface
|   |-- crates/derive                    Derive macros
|   |-- crates/multitenancy              Tenant resolution and isolation
|   |-- crates/observability             Auth metrics and telemetry
|   |-- sql/                             Auth provisioning and migrations
|   `-- athena-auth.yaml                 Auth OpenAPI source
|
|-- packages/athena-js/                 JavaScript/TypeScript SDK workspace
|   `-- publishes as @xylex-group/athena
|
|-- packages/athena-auth-ui/            Auth UI monorepo
|   |-- packages/heroui/                 Published component package
|   `-- publishes as @xylex-group/athena-auth-ui
|
|-- packages/athena-mcp/                MCP server workspace
|   `-- publishes as @xylex-group/athena-mcp
|
|-- packages/create-athena-app/         Scaffolding and migration CLI
|   `-- publishes as create-athena-app
|
|-- apps/docs/                          Product and API documentation
`-- apps/web/                           Athena Studio operator console
```

The Rust root workspace intentionally excludes `services/athena-auth`, which
remains a separate nested Cargo workspace. The root gateway links Auth Core as
a path dependency, so the two systems can be developed and released together
without collapsing their workspace boundaries.

## 3. Core runtime layers

```text
CLIENTS AND OPERATORS
        |
        +--> @xylex-group/athena [PACKAGE]
        |       -> HTTP gateway APIs
        |       -> typed query builder and CRUD operations
        |       -> RPC and REST-compatible calls
        |       -> browser, server, Cloudflare, and Next.js adapters
        |       -> storage, backups, organizations, billing, and admin helpers
        |
        +--> @xylex-group/athena-mcp [PACKAGE]
        |       -> MCP server process
        |       -> MCP tools backed by Athena.js
        |       -> database and operational access for MCP clients
        |
        +--> Athena Studio [APP]
        |       -> operator workflows backed by Athena.js and Auth UI
        |
        `--> direct HTTP/WebSocket/OpenAPI clients
                |
                v
        ATHENA RS GATEWAY [RUNTIME]
                |
                +--> query, gateway, driver, rights, API-key, and control-plane crates
                +--> PostgreSQL / Supabase / D1 / Scylla adapters
                +--> S3 / R2 / storage catalog adapters
                +--> workers, scheduler, CDC, WebSocket, and webhook subsystems
                +--> metrics, logs, audit events, and health surfaces
                |
                `--> database and object-storage infrastructure

AUTHENTICATION CLIENTS
        |
        +--> @xylex-group/athena-auth-ui [PACKAGE]
        |       -> reusable React authentication and account-management UI
        |       -> HeroUI package implementation
        |
        `--> Athena.js auth helpers
                |
                v
        ATHENA AUTH [RUNTIME]
                |
                +--> Auth Core domain and security logic
                +--> HTTP API and server adapter
                +--> sessions, accounts, API keys, organizations, and passkeys
                +--> multitenancy, schema detection, email templates, and observability
                `--> PostgreSQL and optional Redis
```

## 4. Athena RS crate families

The root Rust workspace is organized by capability rather than by one
monolithic application module.

```text
ATHENA RS
|
|-- Transport and application
|   |-- athena-actix
|   |-- athena-gateway
|   |-- athena-wss
|   |-- athena-cdc
|   `-- athena-cli
|
|-- Data access and query execution
|   |-- athena-driver
|   |-- athena-query
|   |-- athena-rights
|   |-- athena-api-key
|   |-- athena-control-plane
|   `-- athena-schema-heal
|
|-- Storage and external providers
|   |-- athena-storage-core
|   |-- athena-storage
|   |-- athena-s3
|   |-- athena-r2
|   |-- athena-backups
|   |-- athena-dns
|   `-- athena-typesense
|
|-- Operations and asynchronous work
|   |-- athena-worker
|   |-- athena-scheduler
|   |-- athena-provisioning
|   |-- athena-webhooks
|   |-- athena-billing
|   |-- athena-billing-core
|   |-- athena-billing-mollie
|   `-- athena-billing-stripe
|
`-- Shared platform concerns
    |-- athena-log
    |-- athena-observability
    |-- athena-macros
    `-- athena-chat
```

Feature flags in the root crate selectively enable storage, billing, S3/R2
backups, webhooks, WebSockets, CDC, provisioning, Typesense, Supabase, Scylla,
metrics, Sentry, and experimental worker or execution features.

## 5. Published JavaScript and developer packages

### `@xylex-group/athena`

```text
packages/athena-js [WORKSPACE]
        |
        |-- publishes as @xylex-group/athena
        |-- ESM and CommonJS output
        |-- TypeScript declarations and subpath exports
        |-- createClient and typed-client APIs
        |-- filters, ordering, pagination, mutations, RPC, and errors
        |-- browser and server clients
        |-- Next.js client/server adapters
        |-- React hooks and organization helpers
        |-- storage, backups, billing, admin, and contract modules
        `-- documentation source: packages/athena-js/docs/
```

The package is the primary programmatic entry point for TypeScript and
JavaScript applications. Its package documentation is a source of truth for
the curated SDK pages generated into `apps/docs/content/docs/sdks/athena-js/`.

### `@xylex-group/athena-auth-ui`

```text
packages/athena-auth-ui [WORKSPACE]
        |
        |-- root workspace is not the publish target
        |-- packages/heroui [WORKSPACE]
        |       -> reusable React UI components and auth flows
        |       -> HeroUI-based implementation
        |       -> Athena.js integration
        `-- publishes as @xylex-group/athena-auth-ui
```

The root `packages/athena-auth-ui/package.json` describes the monorepo. The
actual package metadata and build target live under `packages/heroui`; release
automation must therefore build and publish that workspace rather than the
protected monorepo root.

### `@xylex-group/athena-mcp`

```text
packages/athena-mcp [PACKAGE]
        |
        |-- publishes as @xylex-group/athena-mcp
        |-- binary: athena-mcp
        |-- Node.js >= 18
        |-- MCP SDK transport and tool definitions
        |-- depends on @xylex-group/athena
        |-- YAML and Zod configuration/schema support
        `-- usable by MCP-compatible desktop, IDE, and agent clients
```

Athena MCP is an adapter layer. It exposes Athena operations through the Model
Context Protocol while leaving gateway behavior and database semantics in
Athena RS and Athena.js.

### `create-athena-app`

```text
packages/create-athena-app [PACKAGE]
        |
        |-- publishes as create-athena-app
        |-- binary: create-athena-app
        |-- Node.js >= 20
        |-- project initialization and scaffolding
        |-- doctor and migration commands
        |-- codemods for Athena.js 3 applications
        |-- generated package documentation
        `-- starter integration for Next.js, Vite, and related applications
```

The CLI is the onboarding and migration boundary for new applications. Its
documentation is synchronized into the docs app from
`packages/create-athena-app/docs/`.

## 6. Applications and deployment surfaces

```text
apps/docs [APP]                         apps/web [APP]
athena-docs                             athena-studio
docs.athena-cluster.com                 studio.athena-cluster.com
        |                                        |
        +-- Next.js 16                         +-- Next.js 16
        +-- Fumadocs MDX                       +-- React 19 / HeroUI
        +-- Fumadocs OpenAPI                   +-- Athena.js
        +-- Mermaid and Shiki                   +-- Auth UI
        +-- generated references                +-- Monaco / React Flow
        +-- search and metadata                 +-- React Query / charts
        `-- OpenNext Cloudflare                 `-- OpenNext Cloudflare
```

The apps are separate deployment surfaces but share the repository's package,
OpenAPI, and Cloudflare build infrastructure. Both should be built and
deployed from the same environment when using OpenNext, especially on Windows;
the repository's WSL deployment scripts exist because generated bundles can
contain environment-specific absolute paths and symlink behavior.

## 7. Documentation generation graph

```text
Rust route catalogs ---------------------> openapi.yaml
Rust WebSocket contracts ----------------> openapi-wss.yaml
services/athena-auth/athena-auth.yaml --> prepared Auth OpenAPI
crates/*/Cargo.toml ---------------------> generated workspace reference
billing live route catalog --------------> generated billing reference
contracts and audit descriptors ----------> generated reference pages
packages/athena-js/docs/ ----------------> curated Athena.js site pages
packages/create-athena-app/docs/ --------> curated CLI site pages
                                                  |
                                                  v
                                      apps/docs/content/docs/
                                                  |
                                                  v
                                      athena-docs deployment
```

Generated trees should be changed by editing their source authority and
running the corresponding generator or synchronization command. The docs app
provides drift checks for OpenAPI, Athena.js pages, create-athena-app pages,
links, metadata, and generated references.

## 8. Integration matrix

| Surface | Consumes | Produces or exposes | Primary role |
|---|---|---|---|
| Athena RS | DB, storage, auth-core, provider adapters | HTTP, WebSocket, OpenAPI, workers | Gateway and runtime |
| Athena Auth | PostgreSQL, optional Redis, Auth UI clients | Auth HTTP API, sessions, identity, organizations | Authentication runtime |
| Athena.js | Athena RS/Auth APIs | Typed JS/TS client APIs and React helpers | Application SDK |
| Athena Auth UI | Athena.js, React, HeroUI | Auth screens and reusable components | Frontend auth surface |
| Athena Studio | Athena.js, Auth UI, Athena APIs | Operator workflows | Browser operator console |
| Athena MCP | Athena.js, MCP SDK | MCP tools and `athena-mcp` binary | Agent/IDE integration |
| create-athena-app | Templates, codemods, package metadata | New or migrated projects | Developer onboarding |
| Athena Docs | OpenAPI, package docs, Rust manifests | Public product documentation | Documentation and reference |

## 9. Operational rules

1. Treat `./` as the source of truth for Athena RS runtime behavior and root
   HTTP/WebSocket contracts.
2. Treat `services/athena-auth` as the source of truth for authentication
   behavior, Auth Core, and the Auth OpenAPI contract.
3. Treat `packages/athena-js/docs` and its publish manifest as the source of
   truth for generated Athena.js documentation pages.
4. Treat `packages/create-athena-app/docs` and its publish manifest as the
   source of truth for generated CLI documentation pages.
5. Build and publish `packages/athena-auth-ui/packages/heroui` for the
   `@xylex-group/athena-auth-ui` package; do not publish the monorepo root.
6. Keep `apps/docs` and `apps/web` as deployable applications, not libraries
   consumed directly by downstream projects.
7. Keep MCP-specific protocol and tool concerns in `packages/athena-mcp`; keep
   data access semantics in Athena.js and runtime semantics in Athena RS.
8. Regenerate checked-in documentation and OpenAPI artifacts whenever their
   source contracts change.

## 10. Useful entry points

- Repository: https://github.com/xylex-group/athena
- Product docs: https://docs.athena-cluster.com
- Athena.js package: https://www.npmjs.com/package/@xylex-group/athena
- Auth UI package: https://www.npmjs.com/package/@xylex-group/athena-auth-ui
- Athena MCP package: https://www.npmjs.com/package/@xylex-group/athena-mcp
- create-athena-app package: https://www.npmjs.com/package/create-athena-app
- Studio: https://studio.athena-cluster.com
- Auth service: https://github.com/xylex-group/athena/tree/main/services/athena-auth
