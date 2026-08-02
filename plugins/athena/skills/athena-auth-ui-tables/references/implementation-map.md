# Table Implementation Map

Paths relative to `packages/athena-auth-ui/packages/heroui/`.

## Public barrels

| Path | Role |
| --- | --- |
| `src/tables.ts` | Complete tables entrypoint (incl. models + chips + builder) |
| `src/athena/table-query.ts` | Published narrow re-export of executor |
| `src/athena/table-query-executor.ts` | findMany/select execution + flatten |
| `src/athena/table-query-route.ts` | Next/route `createAthenaTableQueryRoute` |
| `src/index.ts` | Root subset re-exports |

## Folder guide (`src/components/auth/table/`)

| Folder | Owns |
| --- | --- |
| `core/` | `AthenaTable` (`data-table.tsx`), `AuthTable`, empty-state resolve, skeleton, error |
| `hooks/` | query hooks, table view, pagination, selection stores, sorting stores |
| `actions/` | action bar, icon button, action contracts/invocation |
| `rows/` | mobile cards, row actions menu |
| `utils/` | chips/value utils, formatters, column render, sort strategies/state, action config/feedback, `toAthenaTableColumns`, `toTableRowActions` |
| `builder/` | portable presets, config identity, codegen emitters |

## Core

- `core/data-table.tsx` — `AthenaTable` props/columns, client sort, search/status filters, resize, virtualization, desktop/mobile, async loading, action bar + pagination composition. Column field `chip?: AthenaTableChipConfig`.
- `core/auth-table.tsx` — auth-styled wrapper.
- `core/auth-table-empty-state.tsx` / `table-empty-state-resolve.ts` — empty normalization.
- `core/table-skeleton.tsx` / `table-error.tsx` — loading and error shells.
- Package empty primitive: `components/auth/empty-state/table-empty-state.tsx` (exported as `TableEmptyState`).

## Query and pagination

- `hooks/use-athena-query.ts` — finite/infinite TanStack hooks (+ table-prefixed aliases).
- `hooks/use-athena-table-view.ts` — compose query + view columns.
- `hooks/use-athena-table-query.ts` — re-export/compat surface if present.
- `athena/table-query-executor.ts` — findMany/select, filters, order, limits, relations, flatten, counts, row keys, debug AST.
- `hooks/use-data-table-pagination.ts` — server pagination + client slice.

## Sorting and selection

- `hooks/use-table-sorting.ts` — controlled/persisted sorting.
- `utils/table-sorting-state.ts` — normalize, toggle, priority, orderBy conversion.
- `utils/table-sort-strategies.ts` — value extractors, nulls, comparators.
- `hooks/use-table-selection.ts` / `use-table-selection-state.ts` — selection store + TanStack conversion.

## Actions and feedback

- `actions/table-actions.ts` — enable/disable/invoke.
- `actions/data-table-action-bar.tsx` — bulk/standalone bar.
- `actions/icon-action-button.tsx` — icon primitive.
- `rows/table-row-actions-menu.tsx` — per-row menu.
- `utils/table-row-action-helpers.ts` — copy/download/href wrappers.
- `utils/table-action-config.ts` / `table-action-feedback.ts` — declarative config + toast adapters.

## Chips, formatters, models

- `utils/table-value-utils.tsx` — chip config normalize/serialize, renderers, status/boolean colors, thumbnails, stringify/copy/download, pagination display helpers.
- `utils/table-value-formatters.ts` — format kinds.
- `utils/table-column-render.ts` — render vs chip vs format resolution.
- `utils/to-athena-table-columns.ts` — view columns → table columns (+ chip/format passthrough).
- `src/tables.ts` bottom — `AthenaModelRow`, `columnsFromAthenaModel` (chip options on model columns).

## Builder / codegen

- `builder/types.ts`, `preset.ts`, `config-identity.ts`
- `builder/codegen/**` — emit columns (incl. chip), actions, query, transport, component, imports

## Tests (`packages/heroui/tests/`)

High-signal: `athena-table-query`, `table-chip-config`, `to-athena-table-columns`,
`use-athena-table-view`, `table-action-config`, `table-action-feedback`,
`table-sort-strategies`, `table-empty-state-resolve`, `table-error`,
`file-thumbnail`, `athena-table-resizing`, columns-from-model tests if present.

## Example consumers

See [example-showcase.md](example-showcase.md). Cross-cutting changes (e.g.
server multi-sort) touch props → sorting store → conversion → query definition
→ executor → builder serialization → generated code → tests → docs.
