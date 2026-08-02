---
name: athena-auth-ui
description: Integrate, inspect, customize, debug, document, test, or release `@xylex-group/athena-auth-ui` and its HeroUI implementation. Use for any Athena Auth UI public export, React component, page, plugin, hook, email template, workspace/admin surface, table, chat UI, primitive, icon, style, auth routing debug helper, Athena client/proxy/query helper, package entrypoint, generated API docs, example-app integration, or change under `packages/athena-auth-ui/docs/**` and `packages/athena-auth-ui/packages/heroui/**`. Use when the user runs /athena-auth-ui.
---

# Athena Auth UI

Work from the current checkout. Do not rely on remembered exports when the package manifest, barrels, generated docs, and implementations can be inspected directly.

## Establish the source of truth

1. Locate the package root. In the Athena workspace it is `packages/athena-auth-ui`; in the standalone repository it is the repository root.
2. Read `packages/heroui/package.json` for the published subpath export map and package scripts.
3. Read the matching barrel in `packages/heroui/src` for symbol-level exports.
4. Read the matching generated page under `docs` for the documented public contract.
5. Read the concrete implementation and its closest tests, consumers, and example-app route before editing.

Use [references/public-api.md](references/public-api.md) to select the entrypoint and [references/implementation-map.md](references/implementation-map.md) to locate implementations. Read [references/repo-workflows.md](references/repo-workflows.md) for repository changes and validation.

When artifacts disagree:

- Treat `packages/heroui/package.json` as authoritative for importable package subpaths.
- Treat the corresponding `src/*.ts` or `src/*.tsx` barrel as authoritative for symbols exposed by that subpath.
- Treat concrete `src/**` modules as authoritative for runtime behavior.
- Treat generated `docs/**` as the consumer contract that must be brought back into sync.
- Update manifest, barrels, implementation, generated docs, and consumer examples together when the public contract changes.
- Never recommend deep `src`, `dist`, or `compat` imports unless the manifest explicitly publishes them.

## Route the task

### Consumer integration

Read [references/public-api.md](references/public-api.md). Confirm the exact subpath, install required peers, import the package styles once, resolve Athena URL and key aliases explicitly in app code, create the Athena auth client and plugins with those resolved values, and mount the UI under `AuthProvider`. Prefer the narrowest published subpath for infrastructure-only or lower-level code.

### Public API or documentation

Inspect all four layers: `package.json` export map, entrypoint barrel, concrete implementation, and generated docs. Preserve runtime and type exports. Run the docs generator when symbols, signatures, descriptions, or entrypoints change.

### Component, hook, plugin, or behavior change

Read the specific generated component, hook, or function page, then follow it to the source listed in frontmatter or the corresponding implementation family in [references/implementation-map.md](references/implementation-map.md). Reuse existing HeroUI primitives, shared workspace/table utilities, UI option resolution, and plugin slots instead of creating parallel abstractions.

### Auth routing or Athena transport

Trace the real request path across base URL resolution, browser/server client creation, request-header forwarding, proxy handlers, cookies, and the example app. Keep routing-debug behavior aligned with the actual proxy/direct-upstream modes. Athena JS 3 does not read global `process.env` by itself, and current `createAthenaAuthClient(...)` / `createAthenaServerAuthClient(...)` helpers require an explicit `key`, so keep env resolution in one shared app-owned seam and pass the resolved values into every constructor. If the task becomes primarily Athena SDK semantics, also use `$athena-js`.

### Tables, workspace, admin, email, or chat

Treat each as a coordinated subsystem rather than an isolated component. Read its barrel, types, hooks/runtime/client utilities, UI components, generated docs, and tests. Preserve portable table/chat configuration contracts, Athena model-derived types, query keys and invalidation, template metadata keys, and workspace session/admin authorization boundaries.

## Implementation rules

- Prefer published imports and existing package-owned composition seams.
- Preserve the existing `AthenaAuthUiOptions` merge behavior; do not replace unrelated UI configuration while applying an override.
- Keep HeroUI as the internal implementation while exposing package-owned components and types.
- Keep browser-only APIs behind client components or runtime guards.
- Keep server-only proxy/client helpers free from UI imports.
- Preserve email `templateKey` metadata and catalog lookups when changing templates.
- Derive table row and metadata types from `@xylex-group/athena` models instead of introducing colliding wrappers.
- Keep query keys, pagination, mutation invalidation, loading skeletons, empty states, and error feedback aligned across workspace/admin surfaces.
- Preserve backwards-compatible import parsing when changing portable table or chat exports.
- Do not expose `src/compat/**`; those files support internal upstream compatibility.

## Validation

Choose proof matching the changed seam:

- Package behavior: package-local Vitest or the nearest focused test.
- Type/export change: package build and type generation.
- Public contract: docs generation plus package publish checks.
- Example integration: direct example-app `tsc --noEmit` or its build target.
- Browser behavior: browser tests for passkeys, redirects, cookies, route switching, overlays, or stylesheet load order.
- Release: package test, build, `publint`, `attw`, and pack/publish dry-run as available in the current manifest.

Do not treat a formatter as behavioral proof. On Windows, distinguish a successful Next compile followed by OpenNext symlink `EPERM` from an application regression.
