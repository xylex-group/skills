# Table Implementation Map

## Core

- `components/auth/table/core/data-table.tsx`: `AthenaTable`, props and column types, client sorting, search/filtering, resizing, virtualization, desktop/mobile rendering, async loading, action bar, and pagination composition.
- `core/auth-table.tsx`: auth-specific wrapper.
- `core/auth-table-empty-state.tsx`: empty-state normalization.
- `core/table-skeleton.tsx`: loading table shell.

## Query and pagination

- `components/auth/table/hooks/use-athena-table-query.ts`: finite/infinite React Query hooks, query keys, page inputs, and result contracts.
- `athena/table-query-executor.ts`: findMany/select construction, filters, ordering, limits, relation selection, flattening, counts, row keys, and debug AST.
- `hooks/use-data-table-pagination.ts`: server pagination and client slicing.
- `athena/table-query.ts`: published narrow re-export.

## Sorting and selection

- `hooks/use-table-sorting.ts`: controlled/persisted sorting state.
- `utils/table-sorting-state.ts`: normalization, equality, toggling, priority, and orderBy conversion.
- `utils/table-sort-strategies.ts`: value extraction, null handling, and comparator strategies.
- `hooks/use-table-selection.ts` and `use-table-selection-state.ts`: selection store and TanStack conversion.

## Actions and feedback

- `actions/table-actions.ts`: row action contracts, enabled/disabled resolution, and invocation.
- `actions/data-table-action-bar.tsx`: bulk/standalone action bar.
- `actions/icon-action-button.tsx`: icon action primitive.
- `rows/table-row-actions-menu.tsx`: per-row overflow menu.
- `utils/table-row-action-helpers.ts`: copy, download, href, and feedback wrappers.
- `utils/table-action-feedback.ts`: templates, toast adapters, and async action feedback.

## Rendering and responsive behavior

- `utils/table-column-render.ts`: column render resolution.
- `utils/table-value-formatters.ts`: configured value formatting.
- `utils/table-value-utils.tsx`: stringify/copy/download/link helpers, pagination display logic, image checks, chips, and status colors.
- `rows/auth-table-mobile-cards.tsx`: responsive card renderer.
- `utils/auth-table-column-utils.ts`: mobile title/description/metadata/action role resolution.

## Tests and consumers

- Keep utility tests adjacent to the implementation, including `auth-table-column-utils.test.ts`.
- Package browser and release test configuration lives at `packages/heroui/vitest*.config.ts`.
- The main consumer is `examples/next-heroui-example/src/components/table-showcase-page.tsx` with state in `components/table-showcase/use-table-showcase.ts`.
- Builder serialization and tests live in `examples/next-heroui-example/src/lib/table-showcase.ts` and `table-showcase.test.ts`.
- Table catalog loading lives in `src/lib/table-catalog.ts` and API routes under `src/app/api/tables` and `src/app/api/data`.

When changing a cross-cutting feature, trace every relevant family. For example, server multi-sort can touch table props, sorting store, state conversion, query definition, executor, builder serialization, generated code, tests, and docs.
