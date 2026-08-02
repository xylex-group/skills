# Table Public API

Authoritative sources (re-read every task):

- `packages/heroui/package.json` → `./tables`, `./athena/table-query`
- `packages/heroui/src/tables.ts` — full symbol list
- `docs/entrypoints/tables.mdx`, `docs/athena-tables.mdx`, `docs/data-hooks.mdx`

Prefer:

```ts
import { /* … */ } from "@xylex-group/athena-auth-ui/tables"
```

Root `@xylex-group/athena-auth-ui` re-exports a **subset** — confirm in
`src/index.ts` before using root for table-only code.

## API families

| Family | Main exports |
| --- | --- |
| Components | `AthenaTable`, `AuthTable`, `AthenaTableActionBar`, `TableSkeleton`, `TableEmptyState`, `AuthTableMobileCards`, `TableRowActionsMenu`, `IconActionButton`, `AthenaTableError`, `FileThumbnail` |
| Query hooks | `useAthenaQuery`, `useAthenaInfiniteQuery`, aliases `useAthenaTableQuery`, `useAthenaInfiniteTableQuery` |
| View composition | `useAthenaTableView`, `toAthenaTableColumns`, `toReadQueryColumns`, `toTableRowActions` |
| Pagination | `useDataTablePagination`, `useClientPagination` |
| Selection | `useTableSelection`, `useTableSelectionStore`, `toTanstackRowSelection` |
| Sorting | `useTableSorting`, `useTableSortingStore`, `normalizeSortingState`, `sortingStateToOrderBy`, `orderByToSortingState`, sort strategies |
| Query execution | `executeAthenaReadQuery` / `executeAthenaTableQuery`, findMany/select builders, filters/order/limit helpers, flatten, clamp totals |
| Data proxy route | `createAthenaTableQueryRoute`, `handleAthenaTableQueryPost`, `isAthenaTableQueryDefinition` |
| Actions | `canRunAthenaTableAction`, `invokeAthenaTableAction`, action config CRUD, copy/download/href helpers, feedback |
| Chips / values | `AthenaTableChipConfig*`, `createChipRenderer*`, `statusChipRenderer`, `renderChip`, formatters, status/boolean colors |
| Models | `AthenaModelRow`, `columnsFromAthenaModel`, `AthenaRow`/`Insert`/`Update`/`FormValues`, `AthenaTableDef` |
| Builder / preset | `buildTableBuilderPreset*`, `buildGeneratedCode`, import normalizers, path helpers, `TABLE_BUILDER_PRESET_KIND` |
| Feedback / toast | table toast adapters + `AthenaToastProvider` / `showToast*` (shared) |

## Component choices

| Need | Use |
| --- | --- |
| Full generic table | `AthenaTable<Row>` |
| Auth empty-state wrapper | `AuthTable` |
| Centered empty content only | `TableEmptyState` (no action slot; owns min-height) |
| Bulk/standalone toolbar | `AthenaTableActionBar` (selection props optional) |
| Mobile cards | `AuthTableMobileCards` + `resolveAuthTableMobileColumnRole` |
| Per-row overflow menu | `TableRowActionsMenu` |

## Type rules

- Parameterize with the real row type (`AthenaModelRow<typeof model>` or flat row).
- Stable `getRowKey` — never a display index under reorder.
- Align column `id` / `valueKey` with query keys, sort descriptors, action value columns, prefs.
- `columnsFromAthenaModel` is a base helper; override labels/render/chips for rich UI.
- Column display order: `render` → `chip` → `format` → default.

## Query stack trap

| Symbol | Package | Stack |
| --- | --- | --- |
| `useAthenaQuery` | `@xylex-group/athena-auth-ui/tables` | TanStack + optional `dataProxy` |
| `useAthenaReadQuery` | `@xylex-group/athena/react` | Athena-native cache |
| `executeAthenaReadQuery` | `@xylex-group/athena` (re-exported) | Imperative |

One React cache stack per surface.

## Generated docs

Start at `docs/entrypoints/tables.mdx`. Dedicated pages exist for AthenaTable,
action bar, AuthTable, mobile cards, skeleton, empty state, row menus, hooks,
pagination, selection, sorting. Live signatures override this summary.
