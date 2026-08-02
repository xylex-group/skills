# Athena JS Framework Surface

Use this reference when the task touches the published framework-facing
subpaths:

- `@xylex-group/athena/react`
- `@xylex-group/athena/next/client`
- `@xylex-group/athena/next/server`
- `@xylex-group/athena/cookies`
- `@xylex-group/athena/utils`

Start from `docs/complete-method-reference.md` for the callable list, then
confirm the live barrel and implementation.

## Next client

Primary source:

- `src/next/client.ts`
- `docs/next-js.md`
- `docs/auth-session-bridge.md`
- `docs/complete-method-reference.md`

Published responsibilities:

- `createAthenaBrowserClient`
- session bridge browser helpers:
  - `persistAthenaAuthSessionOnAppHost`
  - `clearAthenaAuthSessionOnAppHost`
  - `resolveSessionBridgePayload`
- auth cookie wipe helper re-exports:
  - `clearAuthCookies`
- auth route helpers:
  - `AUTH_DEFAULT_VIEW`
  - `AUTH_ROUTES`
  - `AUTH_VIEW_BY_SEGMENT`
  - `resolveAuthViewFromSegment`
  - `shouldRedirectAuthenticatedAuthView`
- auth URL helpers:
  - `ATHENA_AUTH_PATH`
  - `ATHENA_AUTH_UPSTREAM_ENV_KEYS`
  - `ATHENA_AUTH_UPSTREAM_URL_ENV_NAMES`
  - `DEFAULT_ATHENA_AUTH_ORIGIN`
  - `isAbsoluteUrl`
  - `normalizeAthenaAuthBaseUrl`
  - `resolveAthenaAuthClientBaseUrl`
  - `resolveAthenaAuthRequestUrl`
  - `resolveAthenaAuthUpstreamUrl`
  - `resolveEmailVerificationCallbackUrl`

Rules:

- Require explicit browser-safe config for `createAthenaBrowserClient`.
- Do not reintroduce SDK-owned singleton caching.
- Keep browser helpers no-op or browser-safe outside `window`.

## Next server

Primary source:

- `src/next/server.ts`
- `src/next/shared.ts`
- `src/next/session-bridge/**`
- `docs/next-js.md`
- `docs/auth-session-forwarding.md`
- `docs/auth-session-bridge.md`

Published responsibilities:

- `createAthenaServerClient`
- `resolveAthenaServerContext`
- `resolveNextRequestContext`
- session bridge server helpers:
  - `createAthenaAuthSessionBridgeHandlers`
  - `createAthenaAuthSessionBridgePathHandlers`
  - `handleAthenaAuthSessionBridgePost`
  - `handleAthenaAuthSessionBridgeDelete`
  - `isAthenaAuthSessionBridgePath`
  - `resolveSessionBridgePayload`
- shared bridge constants:
  - `ATHENA_AUTH_SESSION_BRIDGE_ROUTE`
  - `ATHENA_AUTH_SESSION_COOKIE_NAME`
  - `ATHENA_AUTH_SESSION_COOKIE_NAMES`
- cookie/session detection:
  - `hasAuthSessionCookie`

Rules:

- Keep `server-only` boundaries intact.
- Resolve request cookies, bearer, headers, and session identity per request.
- Do not cache the result of `createAthenaServerClient(...)` across requests.
- Keep bridge payload validation, cookie naming, route behavior, and docs synchronized.

## React

Primary source:

- `src/react/index.ts`
- `src/react/query-client.ts`
- `src/react/provider.ts`
- `src/react/use-query.ts`
- `src/react/use-mutation.ts`
- `src/react/use-session.ts`
- `src/react/use-athena-session-client.ts`
- `docs/complete-method-reference.md`

Published responsibilities:

- query runtime:
  - `AthenaQueryClient`
  - `createAthenaQueryClient`
  - `attachStateAdapter`
  - `AthenaQueryClientProvider`
  - `useAthenaQueryClient`
  - `useAthenaGateway`
- hooks:
  - `useQuery`
  - `useMutation`
  - `useSession`
  - `useAthenaSessionClient`
  - `useStorageUpload`
  - `useStorageFiles`
  - `useStorageFileDelete`
- model-form helpers:
  - `createModelFormAdapter`
  - `toModelFormDefaults`
  - `toModelPayload`

Rules:

- Preserve framework-light runtime behavior; this is not a TanStack clone.
- Keep session-bound derived clients as lightweight `withContext(...)` views.
- Preserve browser-safe imports and React singleton compatibility.

## Cookies

Primary source:

- `src/cookies/index.ts`
- `src/cookies/**`
- `docs/auth-cookies.md`
- `docs/complete-method-reference.md`

Published responsibilities include:

- `getSessionCookie`
- `hasAuthSessionCookie`
- `parseCookies`
- `setRequestCookie`
- cookie/session store helpers
- set-cookie parsing helpers

Rules:

- Keep cookie-name compatibility and chunked cookie handling intact.
- Preserve portable request/Header-based APIs; do not tie these helpers to Next unnecessarily.

## Utils

Primary source:

- `src/utils/index.ts`
- `src/utils/**`
- `docs/utils-and-helpers.md`
- `docs/complete-method-reference.md`

Published responsibilities include:

- auth URL and auth route helpers
- auth cookie wipe helpers
- request header builders
- origin and host helpers
- coercion helpers
- SQL literal/escaping helpers
- `isDynamicServerUsageError`

Rules:

- Reuse existing helpers instead of app-local copies.
- Keep browser-safe utilities separate from Node-only behavior.
- When adding a new utility, align barrel exports, docs, and type coverage.

## Validation routing

- Next adapter changes: targeted Next/server/session bridge tests plus `pnpm typecheck`.
- React hook or provider changes: targeted hook/query-client tests, browser-entry checks, and `pnpm typecheck`.
- Cookie helper changes: targeted cookie tests first.
- Utility export changes: focused unit tests, browser-entry or type-compatibility checks when applicable.
- Public callable additions or removals: run `pnpm docs:methods`.
