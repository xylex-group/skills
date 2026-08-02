# Athena JS 3.0.1 Next Adapters

Use this reference when the migration is primarily about Next.js App Router,
request-scoped construction, session forwarding, or confusion around the
published adapter names.

## Published Symbols

Browser:

```ts
import { createAthenaBrowserClient } from "@xylex-group/athena/next/client"
```

Server:

```ts
import {
  createAthenaServerClient,
  resolveAthenaServerContext,
  resolveNextRequestContext,
  createAthenaAuthSessionBridgeHandlers,
} from "@xylex-group/athena/next/server"
```

React helper:

```ts
import { useAthenaSessionClient } from "@xylex-group/athena/react"
```

Do not invent aliases like `createServerAthenaClient`, `createBrowserClient`,
or `createServerClient`.

## Choose The Right Construction Pattern

| Situation | Preferred pattern |
| --- | --- |
| Client Component with public env config | `createAthenaBrowserClient(...)` |
| Server Component / Route Handler / Server Action with request resolution | `await createAthenaServerClient(...)` |
| App already owns a long-lived root client | `createClient(...)` + `withContext(await resolveNextRequestContext())` |
| Need session-aware request payload before building the view | `resolveAthenaServerContext(...)` |
| Need client view derived from an already-built client plus session state in React | `useAthenaSessionClient(...)` |

## Browser Rules

```ts
"use client"

import { createAthenaBrowserClient } from "@xylex-group/athena/next/client"

export const athena = createAthenaBrowserClient({
  url: process.env.NEXT_PUBLIC_ATHENA_URL!,
  key: process.env.NEXT_PUBLIC_ATHENA_PUBLISHABLE_KEY!,
})
```

- Require explicit `url` and `key`.
- Do not pass `env`.
- Do not import `next/server` into client graphs.
- Own singleton lifetime in app code.

## Server Rules

```ts
import "server-only"
import { createAthenaServerClient } from "@xylex-group/athena/next/server"

export function createServerAthena(session?: {
  user?: { id: string }
  session?: { id: string; activeOrganizationId?: string | null }
} | null) {
  return createAthenaServerClient({
    env: process.env,
    session,
  })
}
```

- Require `{ url, key }` or `{ env }`.
- Never call the server adapter with no config.
- Never cache the returned client across requests.
- Keep the import on the server only.

## Explicit Request Inputs

Use explicit request inputs when the task already has a request object or when
tests should bypass automatic `next/headers` resolution:

```ts
await createAthenaServerClient({
  url,
  key,
  requestHeaders: request.headers,
  requestCookies: request.headers.get("cookie"),
  forceNoCache: true,
  headers: { "X-Company-Id": companyId },
})
```

## Shared Root Pattern

```ts
import { createClient } from "@xylex-group/athena"
import { resolveNextRequestContext } from "@xylex-group/athena/next/server"

export const athena = createClient({ env: process.env })

export async function athenaForRequest() {
  return athena.withContext(await resolveNextRequestContext())
}
```

Use this when the real migration seam is app-owned client lifetime and the Next
code should only derive request scope from that shared core.

## Session And Organization Scope

The server adapter maps:

- `session.user.id` -> `userId`
- `session.session.activeOrganizationId` -> `organizationId`

That request scope is merged with any configured app-level `context`.

## Session Bridge

If the app origin differs from the Athena Auth origin, use the app-host httpOnly
session bridge so server-side Next code can see the session cookie.

Route helpers come from `@xylex-group/athena/next/server`:

```ts
import { createAthenaAuthSessionBridgeHandlers } from "@xylex-group/athena/next/server"

export const { POST, DELETE } = createAthenaAuthSessionBridgeHandlers()
```

When the task is mainly about cookie visibility, cross-origin auth, or auth host
versus app host behavior, inspect:

- `packages/athena-js/docs/auth-session-bridge.md`
- `packages/athena-js/docs/auth-session-forwarding.md`
- `packages/athena-js/docs/auth-routing-proxy-and-direct-upstream.md`

## React Session Client

`useAthenaSessionClient(...)` should derive a lightweight `withContext(...)`
view from the same client core. Do not replace it with a second long-lived
client constructor.

## Validation Searches

```powershell
rg -n "createServerAthenaClient|createBrowserClient|createServerClient" .
rg -n "@xylex-group/athena/next/client|@xylex-group/athena/next/server|@xylex-group/athena/react" .
rg -n "resolveAthenaServerContext|resolveNextRequestContext|useAthenaSessionClient|session bridge|session forwarding" .
```

## Validation Targets

- Next fixture typecheck or app typecheck when imports or config types changed.
- Focused app build when the task touches App Router route handlers or MDX docs.
- Targeted test seam when the repo already has unrelated baseline failures.
