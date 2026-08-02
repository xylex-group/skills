# Chips, Models, and Rows

## Athena models

From `@xylex-group/athena` (re-exported on `/tables`):

| Symbol | Meaning |
| --- | --- |
| `AthenaModelRow<TModel>` | `RowOf<TModel>` for table DSL / generated models |
| `AthenaRow` / `AthenaInsert` / `AthenaUpdate` / `AthenaFormValues` | Aliases of SDK `RowOf` / `InsertOf` / `UpdateOf` / `FormValuesOf` |
| `AthenaTableDef` | Table definition type alias |
| `columnsFromAthenaModel(model, options?)` | Build base `AthenaTableColumn[]` from model metadata |

`columnsFromAthenaModel` options:

- `labels` — column id → label override  
- `rowHeaders` — columns marked `isRowHeader` (mobile title)  
- `chips` — column id → **`AthenaTableChipConfig`** (declarative; portable)

Column key order: primary keys first, then remaining keys alphabetically for
stable generation.

Prefer live `table(...).columns(...).primaryKey()` models or generated
`athena/models/*` over hand-rolled row interfaces.

## Rows

- Runtime table rows may be model rows **or** flattened query rows
  (`AthenaTableFlatRow` / read-query flat rows).
- Always pass a stable **`getRowKey`** (prefer query `rowKey` / primary key).
- Relation flattening happens in the executor (`flattenAthenaReadQueryRows` /
  `flattenAthenaRows`) — do not flatten ad hoc in UI.
- Mobile: `AuthTableMobileCards` uses
  `resolveAuthTableMobileColumnRole` (title / description / metadata / action).

## Chips

### Config shape (declarative / portable)

`AthenaTableChipConfig` is JSON-serializable for builder export/import:

- color modes: status, boolean, custom maps  
- `variant`, `size`  
- optional `when` rules (`AthenaTableChipWhen`)  
- item-level overrides (`AthenaTableChipItemConfig`)

Helpers:

| Helper | Role |
| --- | --- |
| `createDefaultAthenaTableChipConfig` | defaults |
| `normalizeAthenaTableChipConfig` | import normalize |
| `serializeAthenaTableChipConfig` | export serialize |
| `chipConfigToOptions` | config → runtime options |
| `createChipRenderer` / `createChipRendererFromConfig` | React renderers |
| `statusChipRenderer` | status shortcut |
| `renderChip` | low-level chip render |
| `resolveAthenaTableChipDescriptors` | value → descriptors |
| `matchesChipWhen` | when-rule match |
| `resolveStatusColor` / `resolveBooleanColor` | color mapping |

### Column attachment

On `AthenaTableColumn`:

```ts
{
  id: "status",
  label: "Status",
  valueKey: "status",
  chip: { color: "status", variant: "soft" },
}
```

`resolveColumnRender` uses chip when `render` is absent. View columns via
`toAthenaTableColumns` pass `chip` through the same path.

Builder columns (`BuilderColumnConfig` / preset columns) include optional
`chip` serialized at the file boundary.

### Showcase patterns

Example app:

- Model demo: `columnsFromAthenaModel` + chip map (`buildChipDemoModelColumnsSample`)
- Imperative: `createChipRenderer` / `renderChip` in `table-showcase-page.tsx`
- Builder UI: chip maps edited as text, normalized through
  `normalizeAthenaTableChipConfig` in `use-table-showcase.ts`

## Do / don't

- **Do** keep chips declarative when the builder or config export must round-trip.
- **Do** use `render` only when the cell needs non-portable React trees.
- **Don't** invent parallel chip systems in the app — extend package configs.
- **Don't** weaken `AthenaModelRow` metadata generics to `never`.
