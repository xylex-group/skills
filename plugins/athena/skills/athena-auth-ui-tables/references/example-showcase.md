# Tables Showcase (next-heroui-example)

Root: `packages/athena-auth-ui/examples/next-heroui-example`

This is the **canonical consumer** for AthenaTables. Prefer reading it before
inventing new app patterns.

## Entry route

`src/app/(site)/tables/page.tsx`:

```tsx
import { TableShowcasePage } from "@/components/table-showcase-page"
// Suspense + resolveExampleAthenaEnvConfig → TableShowcasePage
```

Open locally: `bunx nx run next-heroui-example:dev` → `/tables`.

## Showcase stack

| File | Role |
| --- | --- |
| `src/components/table-showcase-page.tsx` | UI shell: AthenaTable, chips, empty states, actions, import/export panels |
| `src/components/table-showcase/use-table-showcase.ts` | Builder state, query wiring, sorting, actions, chip normalize, presets |
| `src/components/table-showcase/table-showcase-actions.tsx` | Action UI helpers (if present) |
| `src/lib/table-showcase.ts` | Portable types, preset kind, core serialize helpers |
| `src/lib/table-showcase-preset.ts` | Import normalize / build preset |
| `src/lib/table-showcase-codegen/` | Generated consumer TSX |
| `src/lib/table-showcase-samples.ts` | Demo models/samples (incl. chip demos) |
| `src/lib/table-catalog.ts` | Gateway catalog load for schema/table pickers |
| `src/lib/table-showcase.test.ts` (+ samples tests) | Contract tests |

## What the showcase proves

1. **Athena client construction** via example `createExampleBrowserAthena` /
   env config (Athena JS 3 object form).  
2. **`useAthenaQuery`** with builder-derived `AthenaTableQueryDefinition`, page
   state (`nuqs`), admin gates (`useHasAdminAccess`).  
3. **`AthenaTable` composition** — columns from model (`columnsFromAthenaModel`)
   and/or builder view columns (`toAthenaTableColumns`).  
4. **Chips** — model-level chip maps, `createChipRenderer`, status/boolean
   colors, builder column `chip` round-trip.  
5. **Actions** — config CRUD (`appendAthenaTableAction`, …), row menus,
   feedback templates, toast adapters.  
6. **Sorting** — normalize/denormalize, server vs client modes.  
7. **Empty / loading** modes (`EmptyStateMode`) using `TableEmptyState` patterns.  
8. **Portable import/export** — snake_case preset JSON, config hash/seed,
   package versions, generated code preview (`FoldedCodeBlock`).  
9. **Data proxy path** — default `DEFAULT_DATA_PROXY_PATH` toward
   `/api/data/...` using package route helpers.  
10. **Catalog** — tables/schema API for pickers (requires current athena-js
    overlay on Cloudflare builds).  

## Related API routes

| Route | Role |
| --- | --- |
| `/api/data`, `/api/data/[...all]` | Table query proxy |
| `/api/tables/schema` | Catalog / schema for builder |
| `/api/preferences/table-sorting` | Persisted sort prefs |

## Imports pattern (copy this)

```ts
import {
  AthenaTable,
  type AthenaModelRow,
  type AthenaTableColumn,
  columnsFromAthenaModel,
  useAthenaQuery,
  toAthenaTableColumns,
  TableEmptyState,
  TableRowActionsMenu,
  // chips
  createChipRenderer,
  normalizeAthenaTableChipConfig,
} from "@xylex-group/athena-auth-ui/tables"
```

Do not deep-import package `src/components/auth/table/**` from the example.

## Validation for showcase changes

```bash
cd packages/athena-auth-ui/examples/next-heroui-example
bunx vitest run src/lib/table-showcase.test.ts
bunx tsc --noEmit --project tsconfig.json
# full OpenNext (optional):
bunx nx run next-heroui-example:build
```

When changing portable preset fields, update package builder + example lib +
tests + docs in one pass (see query-and-builder-contracts.md).
