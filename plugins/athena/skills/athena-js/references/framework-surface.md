# Athena JS Framework Surface

Use this reference for published framework-facing subpaths:

- `@xylex-group/athena/react`
- `@xylex-group/athena/next/client`
- `@xylex-group/athena/next/server`
- `@xylex-group/athena/cookies`
- `@xylex-group/athena/utils`

Confirm symbols against the live barrel and
`docs/complete-method-reference.md` before editing or documenting.

## Next client (`@xylex-group/athena/next/client`)

Primary sources: `src/next/client.ts`, `docs/next-js.md`,
`docs/auth-session-bridge.md`.

Published responsibilities include:

- `createAthenaBrowserClient` — explicit browser-safe config (`url` + `key`; no
  request `env` / server context)
- Session bridge browser helpers:
  - `persistAthenaAuthSessionOnAppHost`
  - `clearAthenaAuthSessionOnAppHost`
  - `resolveSessionBridgePayload`
- Auth cookie wipe re-exports (e.g. `clearAuthCookies`)
- Auth route helpers:
  - `AUTH_DEFAULT_VIEW`, `AUTH_ROUTES`, `AUTH_VIEW_BY_SEGMENT`
  - `resolveAuthViewFromSegment`
  - `shouldRedirectAuthenticatedAuthView`
- Auth URL helpers:
  - `ATHENA_AUTH_PATH`, upstream env key constants
  - `normalizeAthenaAuthBaseUrl`
  - `resolveAthenaAuthClientBaseUrl`
  - `resolveAthenaAuthRequestUrl`
  - `resolveAthenaAuthUpstreamUrl`
  - `resolveEmailVerificationCallbackUrl`

Rules:

- Require explicit browser-safe config.
- Do not reintroduce SDK-owned singleton caching.
- Keep browser helpers no-op or safe outside `window`.
- Do not invent app-local aliases for helpers the package already exports.

## Next server (`@xylex-group/athena/next/server`)

Primary sources: `src/next/server.ts`, `src/next/shared.ts`,
`src/next/session-bridge/**`, `docs/next-js.md`,
`docs/auth-session-forwarding.md`, `docs/auth-session-bridge.md`.

Published responsibilities include:

- `createAthenaServerClient` — **async**, `server-only`
- `resolveAthenaServerContext`, `resolveNextRequestContext`
- Session bridge server helpers:
  - `createAthenaAuthSessionBridgeHandlers`
  - `createAthenaAuthSessionBridgePathHandlers`
  - `handleAthenaAuthSessionBridgePost`
  - `handleAthenaAuthSessionBridgeDelete`
  - `isAthenaAuthSessionBridgePath`
  - `resolveSessionBridgePayload`
- Bridge constants:
  - `ATHENA_AUTH_SESSION_BRIDGE_ROUTE`
  - `ATHENA_AUTH_SESSION_COOKIE_NAME`
  - `ATHENA_AUTH_SESSION_COOKIE_NAMES`
- Cookie detection: `hasAuthSessionCookie`

Rules:

- Keep `server-only` boundaries intact (do not leak into client bundles).
- Resolve cookies, bearer, headers, and session identity **per request**.
- Never cache `createAthenaServerClient(...)` results across requests.
- Keep payload validation, cookie naming, handlers, docs, and tests synchronized.

## React (`@xylex-group/athena/react`)

Primary sources: `src/react/index.ts` and sibling modules;
`docs/complete-method-reference.md`, `docs/auth/use-session.mdx`,
`docs/read-query.md`.

Published responsibilities include:

**Query runtime**

- `AthenaQueryClient`, `createAthenaQueryClient`, `attachStateAdapter`
- `AthenaQueryClientProvider`, `useAthenaQueryClient`
- `useAthenaGateway`

**Hooks**

- `useQuery`, `useMutation`
- `useSession`, `useAthenaSessionClient`
- `useAthenaReadQuery`
- `useAdminPermission`
- `useStorageUpload`, `useStorageFiles`, `useStorageFileDelete`

**Model form helpers**

- `createModelFormAdapter`, `toModelFormDefaults`, `toModelPayload`

Rules:

- This is intentionally **not** a TanStack Query clone.
- Preserve: no persistent cache by default, inflight dedupe, scoped provider
  state, normalized results/errors, manual refetch after mutations.
- `useAthenaSessionClient` must derive a lightweight `withContext(...)` view.
- Keep return contracts additive and browser-safe.
- Do not confuse with `@xylex-group/athena-auth-ui` TanStack helpers
  (`createAuthUiTanstackQueryClient`, `useAthenaQuery`, etc.).

## Cookies (`@xylex-group/athena/cookies`)

Primary sources: `src/cookies/**`, `docs/auth-cookies.md`.

Published responsibilities include:

- `parseCookies`, `setRequestCookie`, set-cookie header helpers
- `getSessionCookie`, chunked cookie helpers
- `hasAuthSessionCookie`, session cookie patterns
- Session / account stores
- HMAC / JWT helpers used by cookie workflows
- Cookie prefix compatibility (`athena-auth`, legacy `better-auth`)

Rules:

- Preserve cookie-name compatibility and chunked handling.
- Keep APIs portable (Header/request based); do not hard-require Next.

## Utils (`@xylex-group/athena/utils`)

Primary sources: `src/utils/**`, `docs/utils-and-helpers.md`.

Published responsibilities include:

- Auth URL resolution and path constants
- Auth route view maps and redirects
- Auth cookie wipe / sign-out helpers
- Request header builders (`buildAthenaRequestHeaders`, gateway headers, …)
- Origin / host helpers
- Coercion helpers (`assertInt`, boolean flags, …)
- SQL literal / identifier helpers
- Dynamic-server usage guards (`isDynamicServerUsageError`)
- Proxy / request header helpers for app hosts

Rules:

- Reuse package helpers instead of app-local copies.
- Keep browser-safe utilities separate from Node-only behavior.
- New utilities must update barrel exports, docs, and tests together.

## Env (`@xylex-group/athena/env`)

Primary source: `src/env/index.ts`, `docs/env.md`.

SSOT for createClient / Worker / execution-mode key catalogs:

- `ATHENA_ENV_URL_KEYS`
- `ATHENA_ENV_DB_URL_KEYS`
- `ATHENA_ENV_GATEWAY_URL_KEYS`
- `ATHENA_ENV_API_KEY_KEYS`
- `ATHENA_ENV_CLIENT_KEYS`
- primary key constants and resolvers

Do not re-copy these lists into `v3-client`, cloudflare façades, or apps.

## Validation routing

| Change | Gate |
| --- | --- |
| Next adapters / bridge | `test/next-*.test.ts`, `test/session-bridge.test.ts`, `pnpm typecheck` |
| React hooks / provider | `test/react-*.test.ts`, browser-entry when needed, `pnpm typecheck` |
| Cookies | `test/cookies.test.ts`, `test/session-cookie-detection.test.ts` |
| Utils | `test/utils.test.ts`, related auth-url/routes/header tests |
| Env catalogs | `test/env.test.ts` |
| Public callables added/removed | `pnpm docs:methods` |
