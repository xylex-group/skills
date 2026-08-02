---
name: athena-js
description: Runtime and client usage guide for `@xylex-group/athena`, `@xylex-group/athena/react`, and the current `browser`, `cookies`, `utils`, and storage entrypoints. Use when Codex needs to implement or debug Athena JS client construction, unified root vs per-service routing, auth/session-aware requests, query or mutation call sites, RPC/query usage, result helpers, storage helpers, subpath imports, or export-surface issues in the current `athena-js` repo or a consumer repo. For Cloudflare D1/R2 edge adapter, hybrid billing, createCloudflareClient, createAthenaRuntime, or ADR 0015–0020, use `$athena-js-cloudflare-edge-adapter`. For generator config, output presets, dry-run review, or `athena/models` generation layout, also use `$athena-js-generator`. For table DSL, typed registries, `fromModel`, and model-derived form/type work, also use `$athena-js-typed-schema-registry`.
---

# Athena JS

Use this skill for runtime SDK work first:

1. client construction and routing
2. auth and session forwarding
3. query, mutation, RPC, and raw SQL call sites
4. result/error helpers
5. storage and subpath exports
6. auth admin email/template helpers, published limits, and export-surface fixes

If the task is mainly **Cloudflare D1/R2 edge**, hybrid Worker routing, D1 SQL compiler, edge capabilities, or `@xylex-group/athena/cloudflare`, switch to
`$athena-js-cloudflare-edge-adapter`.

If the task is mainly generator config or output layout, switch to
`$athena-js-generator`.

If the task is mainly table DSL, registries, or `fromModel(...)`, switch to
`$athena-js-typed-schema-registry`.

## Source of truth order

1. Read `package.json` first for the current package version and export map.
2. Read `src/index.ts`, `src/browser.ts`, `src/react/index.ts`, `src/utils/index.ts`, and `src/cookies/index.ts` for the actual public surface.
3. Read `docs/getting-started.md` and `docs/api-reference.md` for the current runtime contract.
4. Read `docs/runtime-method-ast-models.md` and `docs/findmany-ast-and-server-contract.md` when the task depends on transport behavior.
5. Read `docs/auth/index.mdx`, `docs/auth-client-bindings.md`, and `docs/auth-session-forwarding.md` when the seam is auth or session propagation.
6. Read `docs/auth/admin.mdx`, `docs/auth/react-email.mdx`, `docs/auth/react-email-api.mdx`, `src/auth/index.ts`, `src/auth/client.ts`, `src/auth/react-email.ts`, and `src/auth/limits.ts` when the seam is auth admin email/template behavior or published SDK limits.
7. Read `docs/storage/index.md` and `docs/athena-client-bindings.md` when the seam is storage route parity.
8. Read [references/runtime-surface.md](references/runtime-surface.md) when you need exact import examples, routing rules, helper guidance, or validation rules without reloading the whole repo doc set.

If docs, generated method docs, and local source disagree:

- trust `package.json` and exported entrypoints over stale docs
- trust the current local checkout over older skill text
- treat deep internal imports as invalid unless the current export map exposes them

Context7 library ID for this SDK: `/xylex-group/athena-js`.

## Follow this workflow

1. Confirm which package seam the task touches: root, react, browser, cookies, utils, auth, or storage.
2. Confirm whether the user is working in the `athena-js` repo itself or in a consumer repo.
3. Prefer the direct SDK surface instead of local wrapper abstractions when the SDK already exposes the needed contract.
4. Keep changes additive when older entrypoints or config shapes still exist for compatibility.
5. Validate with the narrowest gate that matches the seam, then run `pnpm check:all` for repo-facing SDK work.

## Runtime rules

- Treat object-form `createClient({ url, key })` as the canonical unified-root entrypoint (v3).
- Preserve per-service override support through `db`, `auth`, `storage`, `chat`, and `billing` objects.
- **Edge drop-in:** `createClient({ db: { d1 }, storage: { r2 } })` uses the same fluent DB/storage call sites as gateway HTTP. Details and ADRs: `$athena-js-cloudflare-edge-adapter`.
- Prefer `createClient(...).auth` over `createAuthClient(...)` in new code.
- Prefer direct result destructuring and the built-in normalized error shape over app-local Athena wrappers.
- Use `retryReads` (and related diagnostics options) before inventing local retry helpers for ordinary reads.
- Use `@xylex-group/athena/browser` only for browser-safe imports; Node-only generator and introspection APIs must stay out of browser bundles.
- Do not pass D1/R2 bindings into browser bundles.
- Keep storage parity aligned with `src/storage/module.ts`, `docs/storage/index.md`, and the storage manifest/tests together.
- When backend auth limits are known, prefer exporting them from the SDK and validating only the seams the SDK already owns locally instead of inventing broad generic payload rejection paths.

## Consumer repo rules

- Derive from existing `athena/models/*` types when they already exist instead of cloning row or payload types locally.
- Reuse exported SDK constants for auth/admin limits instead of copying magic numbers into app code.
- Do not invent deep imports into `dist/*` or repo-internal files when the package export map does not expose them.
- Keep generator, registry, and runtime seams separate; do not patch a consumer dry-run script when the real bug belongs in `athena-js`.

## Validation

- Repo or package-surface changes: `pnpm typecheck` and `pnpm check:all`
- Route or binding parity work: add or run the targeted test that proves the route family
- Export-surface work: verify `package.json`, then validate both ESM and CJS entrypoints if the change touches exports
