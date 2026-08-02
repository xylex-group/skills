# Athena JS 2.16.x to 3.0.1 Migration Guide

Target package: `@xylex-group/athena@3.0.1`.

Athena JS 3 keeps one runtime-neutral constructor:

```ts
import { createClient, type AthenaClient } from "@xylex-group/athena"

const athena: AthenaClient = createClient({
  url: "https://athena.example.com",
  key: process.env.ATHENA_API_KEY,
})
```

Migrate the construction boundary first. Then fix env resolution, request scope,
Next adapter seams, and legacy types.

## Version Pins

Use exact pins during the migration:

```json
{
  "dependencies": {
    "@xylex-group/athena": "3.0.1",
    "@xylex-group/athena-auth-ui": "2.0.0",
    "@xylex-group/better-auth-athena": "2.0.0"
  }
}
```

Do not start with a caret range. Keep runtime and declaration failures
reproducible while the app is being converted.

## One-Table Mapping

| Athena JS 2.16.x | Athena JS 3.0.1 |
| --- | --- |
| `createClient(url, key, options)` | `createClient({ url, key, ...options })` |
| `AthenaClient.builder()...build()` | `createClient(config)` |
| `AthenaClient.fromEnvironment()` | `createClient({ env })` |
| `createTypedClient(...)` | `createClient({ models })` |
| `createAuthClient(...)` | `createClient(config).auth` |
| `createAthenaBrowserClient(...)` | `@xylex-group/athena/next/client` `createAthenaBrowserClient(...)` or root `createClient(...)` |
| `createAthenaServerClient(...)` | `@xylex-group/athena/next/server` `createAthenaServerClient(...)` or root `createClient(...).withContext(...)` |
| guessed aliases like `createServerAthenaClient` / `createBrowserClient` | rename to the published `createAthenaServerClient` / `createAthenaBrowserClient` symbols |
| `AthenaSdkClient*`, `TypedAthenaClient` | `AthenaClient<TModels>` |
| capability-specific client identities | one `AthenaClient<TModels>` with stable namespaces |
| `withSession(...)`, `withOptions(...)` | `withContext(...)` |
| `experimental.athenaStorageBackend` | removed; use `client.storage` |
| `experimental.typecheckColumns` | removed; typing comes from `models` or explicit row types |
| flat service URL aliases | structured `db`, `auth`, `chat`, `storage`, `billing` config |
| implicit global `process.env` reads | explicit `env: process.env` |

## Step 1: Replace Every Constructor

### Positional construction

```ts
// 2.16.x
const athena = createClient(athenaUrl, athenaKey, {
  headers: { "X-Application": "formations" },
})

// 3.0.1
const athena = createClient({
  url: athenaUrl,
  key: athenaKey,
  headers: { "X-Application": "formations" },
})
```

### Builder construction

```ts
// 2.16.x
const athena = AthenaClient.builder()
  .url(athenaUrl)
  .key(athenaKey)
  .client("formations")
  .build()

// 3.0.1
const athena = createClient({
  url: athenaUrl,
  key: athenaKey,
  client: "formations",
})
```

### Typed construction

```ts
// 2.16.x
const athena = createTypedClient({
  url: athenaUrl,
  key: athenaKey,
  models,
})

// 3.0.1
const athena = createClient({
  url: athenaUrl,
  key: athenaKey,
  models,
})
```

### Auth construction

```ts
// 2.16.x
const auth = createAuthClient({ baseUrl: authUrl, apiKey: athenaKey })

// 3.0.1
const athena = createClient({
  key: athenaKey,
  auth: { url: authUrl },
})
const auth = athena.auth
```

## Step 2: Normalize Next Adapter Seams

3.0.1 publishes thin Next adapters. They do not create a second client core.

### Browser adapter

```ts
import { createAthenaBrowserClient } from "@xylex-group/athena/next/client"

export const athena = createAthenaBrowserClient({
  url: process.env.NEXT_PUBLIC_ATHENA_URL!,
  key: process.env.NEXT_PUBLIC_ATHENA_PUBLISHABLE_KEY!,
  client: process.env.NEXT_PUBLIC_ATHENA_CLIENT,
})
```

Rules:

- Require explicit `url` and `key`.
- Do not pass `env`.
- Own singleton lifetime in app code, not inside the SDK.

### Server adapter

```ts
import "server-only"
import { createAthenaServerClient } from "@xylex-group/athena/next/server"

export function createServerAthena(session?: {
  user?: { id: string }
  session?: { id: string; activeOrganizationId?: string | null }
} | null) {
  return createAthenaServerClient({
    url: process.env.ATHENA_URL!,
    key: process.env.ATHENA_API_KEY!,
    session,
  })
}
```

Rules:

- Require either `{ url, key }` or `{ env }`.
- Never call it with no config.
- Never cache the returned client across requests.
- If the user says `createServerAthenaClient`, map it to `createAthenaServerClient`.

### Shared root plus request view

Use this when the app already owns a long-lived root client:

```ts
import { createClient } from "@xylex-group/athena"
import { resolveNextRequestContext } from "@xylex-group/athena/next/server"

export const athena = createClient({ env: process.env })

export async function athenaForRequest() {
  return athena.withContext(await resolveNextRequestContext())
}
```

Use `resolveAthenaServerContext(...)` when the seam is session-aware request
resolution and you need the resolved request payload explicitly.

Read `next-adapters.md` for the full decision table and session bridge patterns.

## Step 3: Convert Configuration To The Structured Contract

The canonical shape is:

```ts
const athena = createClient({
  url: "https://athena.example.com",
  key: process.env.ATHENA_API_KEY,
  client: "formations",
  backend: "supabase",
  headers: { "X-Application": "formations" },
  models,
  env: process.env,
  context: requestContextProvider,

  db: { url: process.env.ATHENA_DB_URL },
  auth: { url: process.env.ATHENA_AUTH_URL, credentials: "include" },
  chat: { url: process.env.ATHENA_CHAT_URL, wsUrl: process.env.ATHENA_CHAT_WS_URL },
  storage: { url: process.env.ATHENA_STORAGE_URL },
  billing: { url: process.env.ATHENA_BILLING_URL },

  retryReads: true,
  traceQueries: true,
  debugAst: true,
  findManyAst: true,
})
```

Explicit service objects override root derivation. Explicit root fields override
the supplied `env` object.

### URL replacements

| Removed v2 option | 3.0.1 replacement |
| --- | --- |
| `gateway`, `gatewayUrl`, `dbUrl` | `db.url` |
| `authUrl`, `auth.baseUrl` | `auth.url` |
| `chatUrl` | `chat.url` |
| `chatWsUrl` | `chat.wsUrl` |
| `storageUrl` | `storage.url` |
| top-level storage upload options | `storage.directUpload`, storage hooks, file options |

### Removed flags

Delete these instead of renaming them:

- `experimental`
- `athenaStorageBackend`
- `typecheckColumns`
- `enableErrorNormalization`
- `directStorageUpload`

## Step 4: Make Environment Resolution Explicit

Athena JS 3 does not read global `process.env` by itself.

```ts
// Server runtime
export const athena = createClient({ env: process.env })

// Browser runtime
export const athena = createClient({
  env: {
    NEXT_PUBLIC_ATHENA_URL: process.env.NEXT_PUBLIC_ATHENA_URL,
    NEXT_PUBLIC_ATHENA_API_KEY: process.env.NEXT_PUBLIC_ATHENA_API_KEY,
  },
})
```

Do not pass private server secrets into client bundles.

## Step 5: Move Request Scope To `withContext(...)` Or The Server Adapter

```ts
const scoped = athena.withContext({
  userId: session.user.id,
  organizationId,
  cookie: request.headers.get("cookie"),
  bearerToken: request.headers.get("authorization")?.replace(/^Bearer\\s+/i, ""),
  headers: { "X-Company-Id": companyId },
  forceNoCache: true,
})
```

Merge precedence is:

1. client-level `headers`
2. configured `context`
3. `withContext(...)` or the server adapter request scope
4. per-operation headers

## Step 6: Replace Legacy Types

Use `AthenaClient<TModels>`:

```ts
import type { AthenaClient } from "@xylex-group/athena"

let athena: AthenaClient<typeof models>
athena = createClient({ url, key, models })
```

Remove legacy capability-specific client annotations. The namespaces are always
present and fail on use if the service is not configured.

## Step 7: Keep Typing Through `models`

```ts
const athena = createClient({ url, key, models })

await athena.from(models.app.schemas.public.models.users).select("id,email")
await athena.from("users").findMany({
  select: { id: true, email: true },
  where: { status: { eq: "active" } },
})
```

For runtime-only tables, use an explicit row contract:

```ts
type AuditRow = {
  id: string
  action: string
  created_at: string
}

const audit = await athena.from<AuditRow>("runtime_audit").select("id,action")
```

## Step 8: Keep Storage On The Stable Namespace

```ts
const athena = createClient({
  url,
  key,
  storage: {
    url: storageUrl,
    directUpload,
  },
})

const files = await athena.storage.file.list({ catalogId: "documents" })
```

The namespace is stable. Routing is validated at operation time.

## Step 9: Preserve Raw Request Behavior

Use `client.request(...)` for uncovered routes:

```ts
const result = await athena.request<{ ok: boolean }>({
  service: "storage",
  path: "/custom/storage-operation",
  method: "POST",
  body: { resource_id: "file-123" },
})
```

## Search Commands

Run these before editing:

```powershell
rg -n "AthenaClient\.builder|fromEnvironment|createTypedClient|createAuthClient" .
rg -n "createAthenaBrowserClient|createAthenaServerClient|createServerAthenaClient|createBrowserClient" .
rg -n "@xylex-group/athena/next/client|@xylex-group/athena/next/server|resolveAthenaServerContext|resolveNextRequestContext|useAthenaSessionClient" .
rg -n "AthenaSdkClient|TypedAthenaClient|WithStorage|WithAuth|TStrict" .
rg -n "withOptions|withSession|experimental|athenaStorageBackend|typecheckColumns" .
rg -n "gatewayUrl|dbUrl|authUrl|chatUrl|chatWsUrl|storageUrl|auth:\s*\{[^}]*baseUrl" .
```

Expected remaining matches should be migration docs, ADRs, or historical notes only.

## Validation Checklist

- Construction now funnels through `createClient(...)` or the published `next/*` façades.
- Browser code uses `@xylex-group/athena/next/client` only when the adapter is actually needed.
- Server request code uses `createAthenaServerClient(...)` or `withContext(...)`, not a cached request-bound client.
- `models` is passed where compile-time table typing is expected.
- No removed constructor, flag, or legacy type remains in the migrated seam.
- Targeted typecheck, test, or app build passes for the changed seam.

## Primary Source Docs

- `packages/athena-js/docs/migration-v2-to-v3.md`
- `packages/athena-js/docs/next-js.md`
- `packages/athena-js/docs/auth-session-forwarding.md`
- `packages/athena-js/docs/auth-session-bridge.md`
- `packages/athena-js/docs/api-reference.md`
- `packages/athena-js/docs/complete-method-reference.md`

## Common Failures

### `ATHENA_API_KEY_REQUIRED`

The migrated constructor no longer receives a key implicitly. Pass `key` or an
explicit `env` object that contains the expected alias.

### `ATHENA_NO_SERVICE_CONFIGURED` Or `ATHENA_SERVICE_NOT_CONFIGURED`

The namespace exists, but its URL cannot be derived. Set the unified `url`, the
structured service URL, or explicit `env` aliases.

### Requests Are Authenticated But Unscoped

Confirm that request code passes `userId`, `organizationId`, cookies, bearer or
session tokens, and any app-specific headers. Do not rebuild a bare client
inside the route.

### Browser Bundle Includes Server Secrets

Do not pass the full server `process.env` object into client code. Use explicit
public env values only.

### The App Still Mentions `createServerAthenaClient`

That is not a published export. Rename the seam to
`createAthenaServerClient(...)` from `@xylex-group/athena/next/server`.
