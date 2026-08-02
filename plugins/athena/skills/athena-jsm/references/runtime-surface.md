# Athena JS Runtime Contracts

## Client construction and routing

Canonical form is `createClient(config)`. The unified root derives DB `/db`, auth `/auth`, chat `/chat`, chat WebSocket `/chat/ws`, and storage `/storage`. Preserve explicit `db`, `auth`, `chat`, `storage`, and `billing` service configs.

Edge drop-in backends (same fluent call sites):

```ts
createClient({ db: { d1: env.DB }, storage: { r2: env.FILES, prefix: 'app/' } })
```

Hybrid: add `url` + `key` for remote auth/billing; never route billing to the D1 sentinel. Full edge rules: `$athena-js-cloudflare-edge-adapter` and ADRs 0015–0020.

Published Next facades remain part of the runtime contract:

- `createAthenaBrowserClient(...)` from `@xylex-group/athena/next/client`
- `createAthenaServerClient(...)` from `@xylex-group/athena/next/server`
- `resolveAthenaServerContext(...)` and `resolveNextRequestContext(...)`

Treat them as thin wrappers over the same root client contract, not as a second client core.

Use immutable variants deliberately:

- `withSession(session, options)`: derive user, organization, bearer/session tokens, cookies, headers, and no-cache behavior.
- `withContext(context)`: bind equivalent raw request context.
- `withOptions(options)`: intentionally retarget base/service configuration.
- `request({ service, method, path, ... })`: low-level hatch for an unwrapped endpoint.

## Query and mutation behavior

- `findMany` is eager and consumes object select/where/order options.
- `select` returns a deferred thenable chain.
- Insert, upsert, update, and delete are deferred and execute once even when observed through multiple promise methods.
- Update/delete return rows only when selecting or terminating with single/maybeSingle.
- Delete requires a filter or explicit resource ID guard.
- RPC supports filters, order, pagination, selection, single/maybeSingle, count/head/get options.
- Raw SQL and RPC names must be non-empty.
- Preserve schema targeting, relation ASTs, aliases, count/head, pagination hints, UUID-aware filters, and gateway payload names.

Prefer direct `{ data, error, count }` handling. Use `unwrap*`, `requireSuccess`, and `requireAffected` for strict service boundaries; use `normalizeAthenaError` for unknown thrown values. Prefer `experimental.retryReads` to consumer retry wrappers for ordinary reads.

## Auth and request forwarding

Prefer `client.auth.*` for new usage. Preserve grouped domains for sign-in/up, user/session, organization, admin, API keys, two-factor, passkeys, email templates, and OAuth tokens.

Forward request context consistently:

- Preserve cookies and mirror Athena session tokens where required.
- Preserve bearer authorization and mirror the Athena bearer header where required.
- Send `X-Athena-Client` from configured client identity.
- Merge per-call headers over client headers.
- Keep auth proxy/direct-upstream URL normalization in shared utilities.
- Keep app-host session bridge payload extraction, browser POST/DELETE helpers, route handlers, path filters, and cookie-name variants synchronized.
- Reuse exported auth/admin limits and React Email helpers instead of copying numeric or payload constraints into consumers.

For OAuth/provider work, inspect the exact provider and both token exchange paths. Await `onResponse` and `onError` hooks. Respect provider authentication mode such as HTTP Basic versus body credentials, omit undefined IDs, reject unsafe redirects, and preserve provider-specific profile/media handling.

## React and Next

The React package is intentionally not a TanStack Query clone. Preserve no persistent cache by default, inflight dedupe by deterministic key, scoped provider state, normalized results/errors, and manual refetch after mutations.

The published React surface includes:

- query runtime and provider exports
- `useQuery`, `useMutation`, `useSession`, `useAthenaSessionClient`
- storage hooks
- model-form helpers exported from the React barrel

`useAthenaSessionClient(...)` must keep deriving a lightweight `withContext(...)` view from the same client core.

Next adapters must keep server request headers/cookies out of client bundles. Session bridge changes must update payload validation, cookie creation, handlers, client calls, docs, and focused bridge tests together.

## Storage and chat

Keep service manifests, namespace method bindings, request/response types, errors, client exposure, docs, and route-parity tests synchronized. Storage includes grouped credential, catalog, file, folder, permission, object, bucket, multipart, and audit operations; inspect the current manifest rather than assuming this list is complete.

## Billing

Billing is a published subpath and a root/browser namespace, not just an internal helper. Keep these aligned together:

- `src/billing/module.ts`: typed billing client, manifest methods, header/query conventions, webhook raw-body handling, and debug route behavior.
- `src/billing/live-http-routes.json`: JS mirror of the Rust live inventory.
- `src/billing/index.ts`, `src/index.ts`, `src/browser.ts`, and `src/v3-client.ts`: public subpath exports and `client.billing` wiring.
- `test/billing-client.test.ts` and `test/billing-contract-spine.test.ts`: callable behavior and METHOD+path parity with the contract spine.

Preserve `X-Athena-Key` / static-admin-key usage, `connectionId` and `clientName` query/path conventions, provider webhook signature-header passthrough, and `jwt_secret` query support for `GET /debug/billing`.

## Validation routing

- Client/query behavior: relevant builder, transport, AST, trace, or E2E test.
- Auth: auth client/server/route test or OAuth regression/provider test.
- React/Next/cookies: matching query-client, hook, adapter, bridge, or cookie test.
- Storage/chat: route-parity or module-specific test.
- Billing: `test/billing-client.test.ts` for method/query/body behavior and `test/billing-contract-spine.test.ts` for live inventory parity.
- Browser/exports/types: browser-entry, type-compatibility, build, and declaration checks.
- Package completion: `pnpm typecheck`, then `pnpm check:all` when requested or appropriate.
