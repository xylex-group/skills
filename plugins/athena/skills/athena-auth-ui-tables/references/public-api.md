# Table Public API

## Entrypoints

- `@xylex-group/athena-auth-ui/tables`: focused public table API from `packages/heroui/src/tables.ts`.
- `@xylex-group/athena-auth-ui/athena/table-query`: compat re-export of portable read-query from `@xylex-group/athena` (`src/athena/table-query.ts` → `table-query-executor.ts`).
- `@xylex-group/athena-auth-ui`: selected table exports are also available from the root barrel. Confirm each symbol in `src/index.ts` before using the root import.

Prefer `executeAthenaReadQuery` / `AthenaReadQueryDefinition` from `@xylex-group/athena` for non-UI call sites. Prefer auth-ui `useAthenaQuery` for TanStack + pagination + optional `dataProxy`.

The current manifest and barrels are authoritative if this reference drifts.

## API families

| Family | Main exports |
| --- | --- |
| Table components | `AthenaTable`, `AuthTable`, `AthenaTableActionBar`, `TableSkeleton`, `TableEmptyState`, `AuthTableMobileCards`, `TableRowActionsMenu`, `IconActionButton` |
| Query hooks | `useAthenaQuery`, `useAthenaInfiniteQuery` (aliases: `useAthenaTableQuery`, `useAthenaInfiniteTableQuery`) |
| Pagination | `useDataTablePagination`, `useClientPagination`, pagination option/result/summary types |
| Selection | `useTableSelection`, `useTableSelectionStore`, `toTanstackRowSelection`, `TableSelection` |
| Sorting | `useTableSorting`, `useTableSortingStore`, sorting descriptors/state; sorting-state converters and strategies |
| Query execution | `executeAthenaReadQuery` / `executeAthenaTableQuery` (SDK re-export), select/findMany builders, filter/order/limit helpers, row flattening, total clamping |
| Actions | action types, enablement/invocation helpers, copy/download/href builders, feedback wrappers |
| Rendering | column render resolution, value formatting, chips, status colors, templates, image detection |
| Athena model types | `AthenaTableDef`, `AthenaModelRow`, `AthenaRow`, `AthenaInsert`, `AthenaUpdate`, `AthenaFormValues`, `columnsFromAthenaModel` |
| Feedback | toast adapter configuration, feedback templates, copy/action feedback, package toast helpers |

## Component choices

- Use `AthenaTable<Row>` for the complete generic table with sorting, search, status filters, pagination, resizing, virtualization, responsive cards, actions, and async loading support.
- Use `AuthTable` when the caller needs the package-auth empty-state wrapper around a table composition.
- Use `TableEmptyState` for its centered status content, but remember that it owns a `min-h-44` surface and has no action slot. If a consumer needs an empty-state action, place the status and action in one centered wrapper and remove the nested surface's minimum height; never append the action below the full-height `TableEmptyState`.
- Use `AthenaTableActionBar` independently only with optional selection props; do not make selection mandatory for standalone consumers.
- Use `AuthTableMobileCards` and `resolveAuthTableMobileColumnRole` when customizing responsive rendering.

## Type rules

- Parameterize components and columns with the actual row type.
- Use `AthenaModelRow<typeof model>` for Athena models.
- Use stable `getRowKey`; never use a changing display index when records can reorder.
- Keep column IDs aligned with query column keys, sorting descriptors, action value keys, and persisted preferences.
- Treat `columnsFromAthenaModel` as a basic helper, then override labels/renderers explicitly where richer metadata is required.

## Generated docs

Read `docs/entrypoints/tables.mdx` first. Dedicated docs exist for `AthenaTable`, `AthenaTableActionBar`, `AuthTable`, mobile cards, table skeleton and empty state, row action menus, icon actions, table query hooks, pagination, selection, and sorting. Their current signatures and source links override summaries here.
