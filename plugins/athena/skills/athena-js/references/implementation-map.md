# Athena JS Implementation Map

All paths are relative to `packages/athena-js/` unless noted.

## Runtime client and query engine

| Area | Location |
| --- | --- |
| Public `createClient`, service URL resolution, edge binding materialization, namespaces, capabilities | `src/v3-client.ts` |
| Fluent table/RPC builders, gateway payload assembly, request context views, tracing hooks | `src/client.ts` |
| Result helpers, retry, coercion, normalized errors | `src/auxiliaries.ts` |
| Runtime AST models | `src/query-ast.ts` |
| Debug AST | `src/query-debug-ast.ts` |
| Query tracing | `src/query-tracing.ts` |
| Transport / findMany path | `src/query-transport.ts` |
| Portable read-query executor | `src/query/read-query.ts` |
| HTTP gateway client, URL verify, structured select, React gateway hook | `src/gateway/**` |
| DB namespace | `src/db/module.ts` |
| Config errors (`AthenaConfigurationError`) | `src/config/errors.ts` |
| Context merge | `src/context/merge.ts` |
| Diagnostics mode | `src/diagnostics.ts` |
| Package version header helper | `src/sdk-version.ts` |

## Cloudflare edge (D1 / R2)

Prefer skill `$athena-js-cloudflare-edge-adapter` for deep work.

| Area | Location |
| --- | --- |
| Façades + re-exports | `src/cloudflare/index.ts` |
| D1 transport / SQL compiler / runner / rewrite | `src/cloudflare/d1/**` |
| R2 storage module | `src/cloudflare/r2/storage.ts` |
| Capabilities, edge client, runtime, mode resolution, types | `src/cloudflare/{capabilities,edge-client,runtime,execution-mode,types}.ts` |
| Docs | `docs/cloudflare-edge-local.md`, ADRs `docs/adr/0015`–`0020` |
| Tests | `test/cloudflare-*.test.ts` |
| Demo | `examples/cloudflare/**` |

## Auth and identity

| Area | Location |
| --- | --- |
| Auth bindings / route surface | `src/auth/client.ts` |
| Server bootstrap / plugins | `src/auth/server.ts` |
| Request/response contracts | `src/auth/types.ts`, `src/auth/types/**` |
| Fetch lifecycle / hooks | `src/auth/fetch/**` |
| OAuth2, PKCE, JWKS | `src/auth/oauth2/**` |
| Social providers | `src/auth/social-providers/**` |
| Published social-providers subpath | `src/social-providers/index.ts` |
| React Email templates | `src/auth/react-email.ts` |
| Published admin limits | `src/auth/limits.ts` |
| Auth errors | `src/auth/error/**` |
| Admin helpers subpath | `src/admin/index.ts` |
| Organization helpers | `src/organization/**` |

## Framework adapters

| Area | Location |
| --- | --- |
| React query client / provider / hooks | `src/react/**` |
| Next client façade | `src/next/client.ts` |
| Next server façade | `src/next/server.ts` |
| Shared Next helpers | `src/next/shared.ts` |
| Session bridge | `src/next/session-bridge/**` |
| Server session helper | `src/next/get-server-session.ts` |
| Cookies package | `src/cookies/**` |
| Utils package | `src/utils/**` |
| Env catalogs | `src/env/index.ts` |

## Storage, chat, billing

| Area | Location |
| --- | --- |
| Storage module + manifest + live routes | `src/storage/module.ts`, `src/storage/live-http-routes.json` |
| File helpers, direct upload, backup, errors | `src/storage/{file,direct-upload,backup,errors,xhr-put}.ts` |
| Chat module / types | `src/chat/**` |
| Billing module + live routes + subpath | `src/billing/**` |

## Contracts and mappers (ADR 0021)

| Area | Location |
| --- | --- |
| Contract barrels | `src/contracts/**` |
| Zod parse helpers | `src/runtime/**` |
| Named mappers | `src/mappers/**` |
| Inventory doc | `docs/contracts/inventory.md` |

## Schema and generator (boundary skills)

| Area | Location | Route detailed work to |
| --- | --- | --- |
| Table DSL, columns, definitions, model form, targets | `src/schema/**` | `$athena-js-typed-schema-registry` |
| Generator pipeline, config, providers, renderer | `src/generator/**` | `$athena-js-generator` |
| CLI | `src/cli/index.ts`, `bin/athena-js.js` | `$athena-js-generator` |
| Tables catalog / schema handlers | `src/tables/**` | registry skill + runtime ownership |

Root and browser barrels still own whether schema/generator symbols are
publicly and safely exposed.

## Entrypoints

| File | Role |
| --- | --- |
| `src/index.ts` | Full Node/runtime package surface |
| `src/browser.ts` | Browser-safe surface + Node-only stubs |
| `tsup.config.ts` | Build entries |
| `package.json` | Published exports |

## Documentation

Start: `docs/index.md`

| Track | Key files |
| --- | --- |
| Runtime | `getting-started.md`, `api-reference.md`, `complete-method-reference.md`, `runtime-method-ast-models.md`, `findmany-ast-and-server-contract.md`, `storage/index.md` |
| Next | `next-js.md`, `auth-session-bridge.md`, `auth-session-forwarding.md` |
| Auth | `auth/*.mdx`, `auth-client-bindings.md`, `auth-cookies.md`, `athena-auth-url.md` |
| Types | `typed-schema-registry.md`, `type-safety-playbook.md` |
| Generator | `generator-quickstart.md`, `generator-config.md`, `generator-cicd.md`, `cli-command-reference.md` |
| Edge | `cloudflare-edge-local.md` |
| Maintainers | `docs/adr/**`, `client-internal-architecture.md`, `site-publish.md` |

Site dual-publish: package docs → `apps/docs` via `docs/site-publish.md` and
`pnpm docs:site:sync`.

## Tests

Under `test/`, grouped by seam:

- Client / builders: `v3-client`, `query-*`, `filters-payload`, `gateway*`
- Auth: `auth-*`, `oauth2-*`, `social-providers`, `sign-out-lifecycle`
- React: `react-*`, `use-athena-read-query`
- Next / bridge / cookies: `next-*`, `session-bridge`, `cookies`, `get-server-session`
- Storage: `storage-*`
- Billing: `billing-client`, `billing-contract-spine`
- Cloudflare: `cloudflare-*`
- Browser / exports: `browser-entry`, `type-compatibility-v3.ts`
- Schema / generator: `table-builder`, `typed-schema`, `generator-*`, `cli`
- Env / utils / contracts: `env`, `utils`, `contracts-v1`, `auxiliaries`
- SDD dual-suite: `test/sdd/**`
- Fixtures: `test/fixtures/**`, integration under `test/integration/**`

Also: consumer-style workspace `test-sdk/**`.

## Architecture diagrams

`architecture/**` holds before/after PlantUML for recent contract changes. Useful
for history; **never overrides** current source or `package.json`.
