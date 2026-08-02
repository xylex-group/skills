# Athena JS Implementation Map

## Runtime client and query engine

- `src/v3-client.ts`: public `createClient`, service URL resolution, edge binding materialization (`db.d1` / `storage.r2`), namespaces, capabilities attachment.
- `src/client.ts`: fluent table/RPC builders, gateway payload assembly (including mutation `limit`/`offset`), request context, tracing hooks.
- `src/query-ast.ts`, `src/query-debug-ast.ts`, `src/query-trace.ts`: runtime AST models, debugging, and tracing.
- `src/gateway/**`: HTTP client, URL verification, structured select, payload/result/error types, and low-level React gateway hook.
- `src/auxiliaries.ts`, `src/error-core.ts`: unwrap/require/retry/coercion and normalized error contracts.
- `src/db/module.ts`, `src/storage/{module,file}.ts`, `src/chat/{module,types}.ts`: bound service namespaces and manifests.
- `src/billing/{index,module}.ts`, `src/billing/live-http-routes.json`: published billing subpath, billing manifest/client methods, route inventory mirror.

## Cloudflare edge (D1 / R2)

Route detailed work to `$athena-js-cloudflare-edge-adapter`. Ownership:

- `src/cloudflare/d1/{transport,sql,runner,sql-rewrite}.ts`: D1 gateway transport, SQLite compiler, batch runner.
- `src/cloudflare/r2/storage.ts`: L3a R2 object storage module.
- `src/cloudflare/{capabilities,edge-client,runtime,types}.ts`: capabilities, façades, mode resolution, structural binding types.
- Docs: `docs/cloudflare-edge-local.md`, ADRs `docs/adr/0015`–`0020`.
- Tests: `test/cloudflare-*.test.ts`.

## Auth and identity

- `src/auth/client.ts`: full auth binding surface and route normalization.
- `src/auth/server.ts`: server bootstrap, plugins, trusted origins/providers, and runtime handlers.
- `src/auth/types.ts`: request/response/binding contracts.
- `src/auth/fetch/**`: request body conversion, fetch lifecycle, and async hooks.
- `src/auth/oauth2/**`: authorization URLs, code validation, refresh/client-credentials tokens, PKCE, redirect rejection, and JWKS verification/cache.
- `src/auth/social-providers/**`: provider-specific scopes, token authentication, user profile normalization, keys, and verification.
- `src/auth/react-email.ts`, `limits.ts`: email rendering/template builders and published admin limits.
- `src/admin/index.ts`, `src/organization/**`: additive framework-agnostic management helpers.

## Framework adapters

- `src/react/query-client.ts`, `provider.ts`, `use-query.ts`, `use-mutation.ts`: lightweight query runtime with inflight dedupe and manual refetch.
- `src/react/use-session.ts`, `use-athena-session-client.ts`, `use-storage-upload.ts`: auth/session/storage hooks.
- `src/react/index.ts`: public React barrel; treat it as authoritative for the published `./react` surface.
- `src/next/{client,server,shared}.ts`: Next boundaries and request-scoped clients.
- `src/next/session-bridge/**`: bridge constants, payload validation, cookies, handlers, client, and types.
- `src/cookies/**`: portable cookie/session primitives.
- `src/utils/**`: shared auth URLs/routes/cookies, request/origin/header helpers, coercion, SQL literals, and dynamic-server guards.

## Schema and generator boundaries

- `src/schema/**`: table DSL, columns, definitions, model targets, typed clients, model forms, introspection types/providers. Route detailed work to `$athena-js-typed-schema-registry`.
- `src/generator/**` and `src/cli/index.ts`: config, providers, filtering, rendering, pipeline, env, naming, and CLI. Route detailed work to `$athena-js-generator`.
- Root and browser barrels still own whether these symbols are publicly and safely exposed.

## Documentation and tests

- Start from `docs/index.md`, then use `getting-started.md`, `api-reference.md`, `complete-method-reference.md`, runtime AST/server contract docs, auth MDX pages, storage docs, or framework-specific guides.
- Tests are package-local under `test/` and grouped by the same seams: client/builders, transport/AST/trace, auth/server/routes/OAuth/providers, React/query client, Next/session bridge/cookies, storage parity, billing client/contract spine, browser entry, exports/types, schema/generator, and Postgres introspection.
- Architecture before/after diagrams and decisions under `architecture/**` explain recent contract changes but do not override current source.
