# Athena JS Export Map

Read `package.json`, `tsup.config.ts`, and the selected barrel every time; this map is routing guidance, not a frozen manifest.

| Consumer import | Source entry | Primary purpose |
| --- | --- | --- |
| `@xylex-group/athena` | `src/index.ts` | Main server/runtime client, queries, auth, chat/storage types and manifests, results/errors, schema and generator exports |
| `@xylex-group/athena/billing` | `src/billing/index.ts` | Published Athena billing HTTP client, route manifest, and live-route JSON mirror |
| `@xylex-group/athena/browser` | `src/browser.ts` | Browser-safe client and types; Node-only generator/introspection calls fail explicitly |
| `@xylex-group/athena/cloudflare` | `src/cloudflare/index.ts` | Edge façades: `createCloudflareClient`, `createAthenaRuntime`, Worker env helpers (drop-in still via root `createClient`) |
| `@xylex-group/athena/admin` | `src/admin/index.ts` | Framework-agnostic admin helpers |
| `@xylex-group/athena/organization` | `src/organization/index.ts` | Active-organization helpers and types |
| `@xylex-group/athena/react` | `src/react/index.ts` | Query runtime/provider, query/mutation/session/storage hooks, session-bound client helpers |
| `@xylex-group/athena/next/client` | `src/next/client.ts` | Client-side Next integration and bridge utilities |
| `@xylex-group/athena/next/server` | `src/next/server.ts` | Request-scoped server clients, headers/cookies, and bridge handlers |
| `@xylex-group/athena/cookies` | `src/cookies/index.ts` | Cookie parsing, detection, crypto/base64, and session stores |
| `@xylex-group/athena/utils` | `src/utils/index.ts` | Auth URLs/routes/cookies, request headers/origin, coercion, SQL literals, env and string utilities |
| `@xylex-group/athena/social-providers` | `src/social-providers/index.ts` | Published social-provider surface backed by auth provider implementations |

`tsup.config.ts` also builds `cli/index`; it is used by the package binary and is not automatically a consumer subpath. `package.json` is authoritative.

## Synchronization checklist

For a new or changed entrypoint, keep aligned:

1. `package.json.exports` conditional ESM/CJS/types paths.
2. `package.json.typesVersions`.
3. `tsup.config.ts` entry.
4. Source barrel runtime and type exports.
5. Root/browser re-exports where intended.
6. Browser-safe dependency graph or explicit unsupported stubs, especially for `./billing`, root, and `/browser`.
7. Export, browser-entry, type-compatibility, and build tests.
8. README and docs import examples.

Do not expose an internal namespace merely because it has an `index.ts`.
