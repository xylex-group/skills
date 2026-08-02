# Athena JS Runtime Surface

## Contents

1. Root and subpath imports
2. Client construction and routing
3. Auth and session forwarding
4. Query and mutation rules
5. Result and error helpers
6. Storage notes
7. Validation

## Root and subpath imports

Use the root package for the main runtime, auth helpers, schema helpers, and
shared utilities:

```ts
import {
  AthenaClient,
  Backend,
  createClient,
  createTypedClient,
  defineAuthEmailTemplate,
  identifier,
  isOk,
  normalizeAthenaError,
  renderAthenaReactEmail,
  requireAffected,
  requireSuccess,
  unwrap,
  unwrapOne,
  unwrapRows,
  verifyAthenaGatewayUrl,
  withRetry,
} from "@xylex-group/athena"
```

Use the React package for query-client and hook work:

```ts
import {
  AthenaQueryClientProvider,
  createAthenaQueryClient,
  useAthenaReadQuery,
  useMutation,
  useQuery,
  useSession,
} from "@xylex-group/athena/react"
```

Portable page reads (tables/KPIs without TanStack):

```ts
import { createClient, executeAthenaReadQuery } from "@xylex-group/athena"
import { useAthenaReadQuery } from "@xylex-group/athena/react"

// Imperative / server proxy:
await executeAthenaReadQuery({ client, page, pageSize, query })

// React under AthenaQueryClientProvider:
useAthenaReadQuery({ client, page, pageSize, query })
```

Do not confuse:

| Symbol | Package | Stack |
| --- | --- | --- |
| `createAthenaQueryClient` | `@xylex-group/athena/react` | Athena-native cache |
| `createAuthUiTanstackQueryClient` | `@xylex-group/athena-auth-ui` | TanStack (deprecated alias still named `createAthenaQueryClient`) |
| `useAthenaReadQuery` | `@xylex-group/athena/react` | Athena-native + read definition |
| `useAthenaQuery` | `@xylex-group/athena-auth-ui` | TanStack + pagination + optional dataProxy |

Use the browser package only for browser-safe surfaces:

```ts
import {
  AthenaClient,
  createClient,
  createTypedClient,
} from "@xylex-group/athena/browser"
```

Use `@xylex-group/athena/browser` only when the consumer bundle cannot pull in
Node-only generator or introspection helpers.

## Client construction and routing

Canonical runtime shape (v3 object form):

```ts
const athena = createClient({
  url: process.env.ATHENA_URL!,
  key: process.env.ATHENA_API_KEY!,
  client: "my-app",
  retryReads: true,
  traceQueries: true,
})
```

Canonical routing rules:

- `url` is the public Athena root
- default derived service URLs are `${url}/db`, `${url}/auth`, and `${url}/storage`
- explicit `db`, `auth`, and `storage` configs override the derived URLs

### Edge drop-in backends (Workers)

Same constructor; swap backends only:

```ts
import { createClient } from "@xylex-group/athena"

const edge = createClient({
  db: { d1: env.DB },
  storage: { r2: env.FILES, prefix: "app/" },
})

// Hybrid: local D1 + remote auth/billing
const hybrid = createClient({
  db: { d1: env.DB },
  url: env.ATHENA_URL,
  key: env.ATHENA_API_KEY,
})
```

Optional façades from `@xylex-group/athena/cloudflare`: `createCloudflareClient`, `createAthenaRuntime`, `createAthenaFromWorkerEnv`.

Full edge contracts, ADRs 0015–0020, D1 SQL bounds, hybrid billing: use skill `$athena-js-cloudflare-edge-adapter`.

## Auth and session forwarding

Prefer `athena.auth.*` in new code.

Auth context forwarding rules:

- `headers.Cookie` is preserved and Athena session cookies are mirrored onto `X-Athena-Auth-Session-Token`
- `Authorization: Bearer ...` is preserved and mirrored onto `X-Athena-Auth-Bearer-Token`
- `createClient(..., { auth: { bearerToken } })` mirrors the bearer token onto ordinary gateway requests

Prefer the documented grouped auth domains instead of inventing repo-local
request wrappers:

- sign-in and sign-up
- user and session
- organization
- admin
- API keys
- two-factor and passkeys

## Query and mutation rules

- `findMany(...)` is the canonical eager object-select read API
- `select(...)` returns a deferred chain that executes on `await`
- `single(...)` and `maybeSingle(...)` are select terminators
- `insert(...)`, `upsert(...)`, `update(...)`, and `delete(...)` are deferred chains too
- `update(...)` and `delete(...)` only return rows when `.select(...)`, `.single(...)`, or `.maybeSingle(...)` is requested
- `query(sql)` requires a non-empty SQL string
- `rpc(name)` requires a non-empty function name

Important guardrails:

- `eq()` is UUID-aware for `id`, `*_id`, and `*uuid*`-style columns
- `delete()` throws when there is no filter and no `resourceId`
- use `eq("id", ...)`, `eq("resource_id", ...)`, or `delete({ resourceId })` for the clearest delete path

## Result and error helpers

Prefer direct destructuring:

```ts
const { data, error, count } = await athena
  .from<UserRow>("users")
  .select("id,email")
```

Rules:

- use the built-in normalized error shape
- use `requireSuccess(...)` and `requireAffected(...)` when strict service-layer handling is needed
- use `unwrapRows(...)` and `unwrapOne(...)` to collapse common result handling
- use `normalizeAthenaError(...)` only when normalizing unknown thrown values outside a typed Athena result path
- prefer `experimental.retryReads` over local retry wrappers for ordinary read calls

## Storage notes

Treat these as a parity trio:

1. `src/storage/module.ts`
2. `docs/storage/index.md`
3. storage manifest and tests

Current grouped storage namespaces include:

- `credentials`
- `catalog`
- `file`
- `folder`
- `permission`
- `object`
- `bucket`
- `multipart`
- `audit`

Validate the affected route family, not just a broad build, when changing
storage surfaces.

## Validation

Use the narrowest matching gate first:

- exports or entrypoints: targeted export or package tests
- runtime surface changes: targeted test plus `pnpm typecheck`
- repo-facing SDK changes: `pnpm check:all`

