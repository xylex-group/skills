---
name: athena-auth-ui-tables
description: Build, integrate, inspect, debug, customize, document, test, or release Athena Auth UI table surfaces. Use for `AthenaTable`, `AuthTable`, `/tables`, `/athena/table-query`, Athena model-derived rows and columns, findMany/select execution, relation flattening, server or client sorting, filtering, pagination, selection, virtualization, loading and empty states, row and bulk actions, action feedback, mobile cards, value renderers, table builder configuration, generated table code, or any implementation and docs under `packages/athena-auth-ui/packages/heroui/src/components/auth/table/**`, `src/athena/table-query*`, and the table showcase. Use when the user runs /athena-auth-ui-tables.
---

# Athena Auth UI Tables

Use the current checkout as source of truth. Also use `$athena-auth-ui` when the task changes package-wide exports, styles, providers, release behavior, or non-table workspace UI. Use `$athena-js` when the issue is primarily Athena SDK model/query semantics.

## Read in this order

1. Locate the Athena Auth UI package root. In the Athena workspace use `packages/athena-auth-ui`; in the standalone repository use the repository root.
2. Read `packages/heroui/package.json` and confirm `/tables` and `/athena/table-query` are published.
3. Read `packages/heroui/src/tables.ts` for the complete public symbol surface.
4. Read `docs/entrypoints/tables.mdx` and the dedicated generated docs page for the affected component or hook.
5. Read the concrete implementation family from [references/implementation-map.md](references/implementation-map.md).
6. Read the nearest tests and example-app table consumer before editing behavior.

Use [references/public-api.md](references/public-api.md) for export selection, types, and invariants. Use [references/query-and-builder-contracts.md](references/query-and-builder-contracts.md) for Athena query execution and portable builder configurations.

## Route the task

### Render or compose a table

Start with `AthenaTable` for the full generic table and `AuthTable` for auth-styled empty-state normalization. Define stable row keys, typed columns, loading state, empty state, sorting mode, pagination, and accessible labels explicitly. Use package renderers and action helpers before introducing application-local copies.

Treat `emptyState` as one complete composition. Keep its title, description, and actions in a single centered shell. `TableEmptyState` already owns a `min-h-44` centered surface, so do not append an action below that full-height surface. When the public component has no action slot, collapse its internal minimum height inside one centered consumer wrapper or reuse an existing action-capable shared empty-state primitive.

### Connect Athena data

Use `useAthenaQuery` or `useAthenaInfiniteQuery` (aliases: `useAthenaTableQuery` / `useAthenaInfiniteTableQuery`) with an `AthenaReadQueryDefinition` (alias: `AthenaTableQueryDefinition`). Execution is `@xylex-group/athena` `executeAthenaReadQuery` (re-exported as `executeAthenaTableQuery`). Preserve mode-specific behavior for `findMany` and fluent `select`, relation selection and flattening, filters, multi-column order, limits, count handling, and debug AST output. Never bypass `@xylex-group/athena` with a parallel database client. For SDK-native React cache without TanStack/`dataProxy`, use `@xylex-group/athena/react` `useAthenaReadQuery` instead of the auth-ui hooks.

### Change sorting, selection, or pagination

Trace controlled props, internal Zustand stores, TanStack state conversion, persisted preferences, and server query conversion together. Keep page reset behavior, total counts, limit clamping, selection identity, sort priority, null ordering, and client/server sorting ownership explicit.

### Change actions, renderers, or feedback

Keep action enablement, disabled reasons, invocation, templates, toast adapters, copy/download/href helpers, mobile cards, and desktop rows aligned. Preserve generic row typing and avoid embedding app-specific behavior in the reusable table layer.

### Change the table builder or generated code

Treat the example-app builder JSON as a portable contract. Update serialization, legacy import normalization, preview, generated code, config hash/seed, package versions, UI fields, tests, and docs in the same pass.

### Change exports or docs

Update the concrete implementation, `src/tables.ts`, root `src/index.ts` where intended, `package.json` for new subpaths, generated docs, and example imports together. Do not recommend deep `src` or `dist` imports.

## Invariants

- Derive model rows and metadata from `@xylex-group/athena`; do not create colliding wrapper model types.
- Keep `AthenaModelRow<TModel>` compatible with real column and relation metadata.
- Keep row keys stable across pagination, sorting, refetching, desktop rows, and mobile cards.
- Keep server sorting out of client sort comparators and client sorting out of server query mutation.
- Preserve multi-column sort priority and convert sorting state at one explicit boundary.
- Keep loading controls as skeletons and known-unavailable actions disabled before invocation.
- Preserve rounded package components and existing HeroUI composition patterns.
- Avoid layering an idle drop-zone border around a table empty state when the surrounding card or table already provides the surface. Preserve the rounded drag-hover treatment, and show an idle drop-zone border only when it communicates a populated table boundary.
- Keep action-bar props optional where standalone consumers do not own selection state.
- Keep query keys deterministic and include every input that changes returned rows.
- Preserve backwards-compatible imports while emitting only the current portable builder format.

## Validation

Match proof to the seam:

- Query builders, sorting conversions, formatters, and import normalization: focused unit tests.
- Components, selection, action menus, responsive behavior, and virtualization: browser tests.
- Types or exports: package build and declaration generation.
- Public API: docs generation and package publish checks.
- Builder behavior: table-showcase tests plus direct example-app typecheck/build.

Do not stop at formatting when behavior changed. On Windows, distinguish a successful Next compile followed by OpenNext symlink `EPERM` from a table regression.
