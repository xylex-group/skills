# Athena JS Export Map

Authoritative live sources (always re-read; this file is routing guidance):

1. `packages/athena-js/package.json` → `exports`, `typesVersions`, `bin`, `main`/`module`/`types`
2. `packages/athena-js/tsup.config.ts` → build entry names
3. The barrel file for the chosen subpath

Package name: `@xylex-group/athena`  
Binary: `athena-js` → `bin/athena-js.js` (built `cli/index`; not a package subpath)

## Published consumer imports

| Consumer import | Source barrel | Primary purpose |
| --- | --- | --- |
| `@xylex-group/athena` | `src/index.ts` | Full Node/runtime surface: `createClient`, queries, auth helpers, schema/generator (Node), storage/chat/billing types & manifests, results/errors, contracts re-exports |
| `@xylex-group/athena` (browser condition) | `src/browser.ts` via package `exports["."].browser` | Automatic browser-safe root import; Node-only APIs stubbed |
| `@xylex-group/athena/browser` | `src/browser.ts` | Explicit browser-safe client + types |
| `@xylex-group/athena/cloudflare` | `src/cloudflare/index.ts` | Edge façades: `createCloudflareClient`, `createAthenaRuntime`, `createAthenaFromWorkerEnv`, D1/R2 helpers, capabilities, mode resolution |
| `@xylex-group/athena/billing` | `src/billing/index.ts` | Billing HTTP client types, `createBillingModule`, `billingSdkManifest`, `billingLiveHttpRoutes` |
| `@xylex-group/athena/admin` | `src/admin/index.ts` | Framework-agnostic admin permission helpers |
| `@xylex-group/athena/organization` | `src/organization/index.ts` | Active-organization helpers |
| `@xylex-group/athena/react` | `src/react/index.ts` | Query runtime/provider, hooks, gateway hook, model-form helpers |
| `@xylex-group/athena/next/client` | `src/next/client.ts` | Browser Next façade + bridge client helpers + auth route/URL re-exports |
| `@xylex-group/athena/next/server` | `src/next/server.ts` | Async server façade, request context, bridge handlers (`server-only`) |
| `@xylex-group/athena/cookies` | `src/cookies/index.ts` | Cookie parse/set, session stores, JWT/HMAC helpers, session cookie detection |
| `@xylex-group/athena/utils` | `src/utils/index.ts` | Auth URLs/routes/cookies, request headers/origin, coercions, SQL literals, env helpers |
| `@xylex-group/athena/env` | `src/env/index.ts` | Canonical env key catalogs and resolvers for createClient / Workers |
| `@xylex-group/athena/contracts` | `src/contracts/index.ts` | Contract layer barrel |
| `@xylex-group/athena/contracts/v1` | `src/contracts/v1/index.ts` | Versioned DTOs: errors, pagination, JSON value types, transport codes |
| `@xylex-group/athena/social-providers` | `src/social-providers/index.ts` | Published social-provider surface |
| `@xylex-group/athena/package.json` | `package.json` | Version introspection |

## Built but not automatically published as subpaths

| tsup entry | Notes |
| --- | --- |
| `cli/index` | Package binary only unless also listed under `exports` |

Do not expose an internal folder merely because it has an `index.ts`.

## Root vs browser differences (high signal)

Root (`src/index.ts`) includes Node-capable generator and Postgres introspection
exports. Browser (`src/browser.ts`) re-exports the client/auth/results/storage
surface and **throws** on Node-only generator/introspection calls with a clear
message.

Both root and browser re-export `createClient` and stable service types.

## Synchronization checklist

When adding or changing a public entrypoint, update **all** of:

1. `package.json.exports` (ESM + CJS + types; browser condition for root if needed)
2. `package.json.typesVersions`
3. `tsup.config.ts` `entry`
4. Source barrel runtime + type exports
5. Root and/or browser re-exports when the symbol is dual-surface
6. Browser dependency graph or explicit unsupported stubs
7. Export / browser-entry / type-compatibility tests
8. README + docs import examples (`docs/api-reference.md`, complete method reference)

## Import examples

```ts
// Unified root (server or browser — package conditions pick the entry)
import { createClient, unwrapRows } from "@xylex-group/athena"

// Explicit browser
import { createClient } from "@xylex-group/athena/browser"

// Next
import { createAthenaBrowserClient } from "@xylex-group/athena/next/client"
import { createAthenaServerClient } from "@xylex-group/athena/next/server"

// React
import {
  AthenaQueryClientProvider,
  createAthenaQueryClient,
  useQuery,
  useSession,
  useAthenaReadQuery,
} from "@xylex-group/athena/react"

// Workers
import {
  createAthenaFromWorkerEnv,
  createCloudflareClient,
} from "@xylex-group/athena/cloudflare"

// Env SSOT
import {
  ATHENA_ENV_URL_KEYS,
  ATHENA_ENV_API_KEY_KEYS,
} from "@xylex-group/athena/env"

// Billing subpath
import { billingSdkManifest, billingLiveHttpRoutes } from "@xylex-group/athena/billing"

// Contracts
import type { OffsetPage, AthenaErrorBody } from "@xylex-group/athena/contracts/v1"
```
