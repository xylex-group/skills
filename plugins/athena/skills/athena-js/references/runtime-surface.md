# Athena JS Runtime Surface

## Contents

1. Client construction and routing
2. Request context and headers
3. Query and mutation rules
4. Results and errors
5. Auth and session forwarding
6. Storage, chat, billing
7. React and Next (summary)
8. Diagnostics
9. Validation routing

## Client construction and routing

Canonical form (v3+):

```ts
import { createClient } from "@xylex-group/athena"

const athena = createClient({
  url: process.env.ATHENA_URL!,
  key: process.env.ATHENA_API_KEY!,
  client: "my-app",
  retryReads: true,
  diagnostics: "auto",
})
```

Rules:

- `createClient` is the only **primitive** materializer (synchronous, runtime-neutral).
- One client type: `AthenaClient<TModels>`.
- Unified root derives service paths: `/db`, `/auth`, `/chat`, `/chat/ws`, `/storage`.
- Explicit `db` / `auth` / `chat` / `storage` / `billing` configs override derived URLs.
- Namespaces are always present; unconfigured services throw
  `AthenaConfigurationError` with `ATHENA_SERVICE_NOT_CONFIGURED` when invoked.
- `models: registry` enables model-derived table/column typing (no boolean
  “strict mode” flag).
- Pass `env` explicitly for alias resolution catalogs from `@xylex-group/athena/env`.
- There is **no** general-purpose runtime `experimental` bag. Prefer top-level
  `retryReads`, `traceQueries`, `debugAst`, `findManyAst`, and storage options.

Per-service configuration sketch:

```ts
createClient({
  key,
  db: { url, pgUri },
  auth: { url, credentials: "include", bearerToken },
  chat: { url, wsUrl },
  storage: { url, directUpload, onError, prefixPath },
  billing: { url },
})
```

### Edge drop-in (Workers)

Same constructor; swap backends only:

```ts
createClient({
  db: { d1: env.DB },
  storage: { r2: env.FILES, prefix: "app/" },
})

// Hybrid: local D1 + remote auth/billing
createClient({
  db: { d1: env.DB },
  url: env.ATHENA_URL,
  key: env.ATHENA_API_KEY,
})
```

Façades from `@xylex-group/athena/cloudflare`:

- `createCloudflareClient` — always edge
- `createAthenaFromWorkerEnv` — best DX (`mode` + `client`)
- `createAthenaRuntime` / `createAthenaRuntimeClient`
- `resolveAthenaExecutionMode`

Env: `ATHENA_EXECUTION_MODE`, `ATHENA_EXECUTION_PREFER` (default prefer edge when both D1 and URL exist).

Full edge contracts, D1 SQL bounds, hybrid billing honesty, ADRs 0015–0020 →
skill `$athena-js-cloudflare-edge-adapter`.

### Next façades

```ts
import { createAthenaBrowserClient } from "@xylex-group/athena/next/client"
import { createAthenaServerClient } from "@xylex-group/athena/next/server"

const browser = createAthenaBrowserClient({ url, key })
const server = await createAthenaServerClient({ url, key }) // per request
```

Thin wrappers over `createClient` only (ADR 0014). No SDK-owned request cache.

### Immutable views

- `withContext(context)` — bind user/org/bearer/cookie/headers/no-cache
- `withSession(session, options)` when available — derive context from session
- `withOptions(options)` — retarget base/service configuration deliberately
- `request({ service, method, path, ... })` — unwrapped low-level hatch

## Request context and headers

Provider form:

```ts
createClient({
  url,
  key,
  context: async () => ({
    cookie: await currentCookieHeader(),
    bearerToken: await currentBearerToken(),
    organizationId: await currentOrganizationId(),
  }),
})
```

Header / auth forwarding invariants:

- Cookies preserved; Athena session cookies mirrored to
  `X-Athena-Auth-Session-Token` where required
- `Authorization: Bearer …` preserved and mirrored to
  `X-Athena-Auth-Bearer-Token` where required
- `key` → `X-Athena-Key`
- configured `client` → `X-Athena-Client` (required for managed storage catalog resolution)
- Header merge order: client headers → configured context → `withContext` → operation headers
- Prefer package header builders from `@xylex-group/athena/utils` over app copies

Env key catalogs (SSOT in `src/env/index.ts`):

| Catalog | Purpose |
| --- | --- |
| `ATHENA_ENV_URL_KEYS` | Unified root URL |
| `ATHENA_ENV_DB_URL_KEYS` | DB/gateway service URL |
| `ATHENA_ENV_GATEWAY_URL_KEYS` | Root + DB combined for mode resolution |
| `ATHENA_ENV_API_KEY_KEYS` | API key aliases |
| `ATHENA_ENV_CLIENT_KEYS` | Client name aliases |

Service-specific auth/chat/storage URL keys stay in their owning modules.

## Query and mutation rules

Namespaces and root shortcuts share the same query engine:

```ts
await athena.from("users").eq("active", true).select("id,email")
await athena.db.from("users").eq("id", id).single()
await athena.rpc("reserve_case_number", { organization_id: "org_1" })
await athena.query("select now()")
```

Behavior:

| API | Execution |
| --- | --- |
| `findMany(...)` | Eager object-select read |
| `select(...)` | Deferred thenable chain |
| `insert` / `upsert` / `update` / `delete` | Deferred chains; single execution |
| `single` / `maybeSingle` | Select terminators |
| `update` / `delete` | Return rows only when selecting / single / maybeSingle |
| `query(sql)` | Non-empty SQL required |
| `rpc(name)` | Non-empty function name required |

Guardrails:

- `eq()` is UUID-aware for `id`, `*_id`, and `*uuid*`-style columns
- `delete()` requires a filter or explicit `resourceId`
- Prefer `eq("id", …)`, `eq("resource_id", …)`, or `delete({ resourceId })`
- Preserve schema targeting, relation ASTs, aliases, count/head, pagination

Portable page definitions (tables/KPIs without TanStack):

```ts
import { executeAthenaReadQuery } from "@xylex-group/athena"
import { useAthenaReadQuery } from "@xylex-group/athena/react"

await executeAthenaReadQuery({ client, page, pageSize, query })
useAthenaReadQuery({ client, page, pageSize, query })
```

Do not confuse Athena React symbols with `@xylex-group/athena-auth-ui` TanStack helpers.

## Results and errors

Prefer direct destructuring:

```ts
const { data, error, count } = await athena
  .from<UserRow>("users")
  .select("id,email")
```

Helpers from root/browser:

- `isOk`, `unwrap`, `unwrapOne`, `unwrapRows`
- `requireSuccess`, `requireAffected`
- `normalizeAthenaError` — only for unknown thrown values outside typed results
- `withRetry` — generic retry helper; prefer `retryReads` for ordinary reads
- `AthenaError`, `AthenaErrorCode`, categories/kinds as exported

Contracts layer (`@xylex-group/athena/contracts/v1`): pagination and transport
error DTOs + Zod schemas in `src/runtime/`. Map with `src/mappers/**`
(ADR 0021 — Persistence ≠ Athena ≠ domain ≠ API ≠ UI).

## Auth and session forwarding

Prefer `athena.auth.*` domains:

- sign-in / sign-up
- user / session
- organization
- admin
- API keys
- two-factor / passkeys
- email templates / admin email
- OAuth token helpers

Published limits (`ATHENA_AUTH_ADMIN_LIMITS`, max JSON bytes/depth, template
variable caps) come from the SDK — reuse them.

React Email: `defineAuthEmailTemplate`, `renderAthenaReactEmail`,
`createAuthReactEmailInput`.

Session bridge (app-host httpOnly cookie) must keep synchronized:

- payload validation
- browser POST/DELETE helpers
- route handlers and path filters
- cookie name constants / variants
- docs (`auth-session-bridge.md`, `auth-session-forwarding.md`)

OAuth/provider work: inspect the **named** provider module; await
`onResponse` / `onError` hooks; respect Basic vs body credentials; reject unsafe
redirects; preserve provider-specific profile contracts.

## Storage, chat, billing

### Storage

Managed namespace groups (verify against current `storageSdkManifest`):

- credentials, catalog, file, folder, permission
- object, bucket, multipart, audit, **backup**

Also:

- high-level `athena.storage.file.*` helpers honor `storage.prefixPath` templates
- direct upload / XHR paths under `src/storage/`
- edge R2 L3a object API via cloudflare façade is **not** full managed storage

Parity trio: `src/storage/module.ts` + `docs/storage/index.md` +
`test/storage-*.test.ts` / live route JSON.

### Chat

`athena.chat` namespace and types under `src/chat/**`. Keep WebSocket URL
derivation (`wsUrl` / `/chat/ws`) intact.

### Billing

Billing is both:

1. Root/browser namespace `client.billing`
2. Published subpath `@xylex-group/athena/billing`

Keep aligned:

- `src/billing/module.ts` methods and header/query conventions
- `src/billing/live-http-routes.json`
- root/browser/`v3-client` wiring
- `test/billing-client.test.ts` + `test/billing-contract-spine.test.ts`

Preserve static admin key headers, `connectionId` conventions, provider webhook
raw-body handling, and debug route query support.

## React and Next (summary)

React is **not** TanStack Query:

- no persistent cache by default
- inflight dedupe by deterministic key
- manual refetch after mutations
- `useAthenaSessionClient` derives a lightweight `withContext` view

Published hooks include `useQuery`, `useMutation`, `useSession`,
`useAthenaSessionClient`, `useAthenaReadQuery`, `useAdminPermission`,
`useStorageUpload`, `useStorageFiles`, `useStorageFileDelete`, plus
`useAthenaGateway` and model-form helpers.

Next server clients resolve cookies/bearer per request and must not be cached
across requests. Details:
[framework-surface.md](framework-surface.md).

## Diagnostics

```ts
createClient({
  url,
  key,
  retryReads: true,
  traceQueries: { logger: (event) => telemetry.emit(event) },
  debugAst: true,
  findManyAst: true,
  diagnostics: "auto", // quiet in production / OpenNext build
})
```

- Read retries never convert mutations into retryable operations
- Diagnostic payloads must not include credentials
- `client.capabilities` reports gateway vs edge-local support (ADR 0020)

## Validation routing

| Change | First proof |
| --- | --- |
| Construction / routing / context | `test/v3-client.test.ts`, `test/env.test.ts` |
| Builders / AST / transport | `test/query-*.test.ts`, `test/gateway*.test.ts` |
| Auth | `test/auth-*.test.ts`, OAuth/provider tests |
| React | `test/react-*.test.ts` |
| Next / bridge | `test/next-*.test.ts`, `test/session-bridge.test.ts` |
| Cookies / utils | `test/cookies.test.ts`, `test/utils.test.ts` |
| Storage | `test/storage-*.test.ts` |
| Billing | `test/billing-*.test.ts` |
| Cloudflare | `test/cloudflare-*.test.ts` |
| Browser / exports | `test/browser-entry.test.ts` |
| Public API / types | `pnpm typecheck` |
| Package complete | `pnpm check:all` |
