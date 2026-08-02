# Query and Builder Contracts

## Portable read query

`AthenaReadQueryDefinition` (alias `AthenaTableQueryDefinition`) owns columns,
count column, filters, limit, mode, order, row key, schema, and table.

Source of truth execution: `@xylex-group/athena` `executeAthenaReadQuery`
(alias `executeAthenaTableQuery`). auth-ui re-exports for UI convenience.

### Mode-specific paths

**findMany**

- Nested select + where objects  
- orderBy → SDK shape  
- count request  
- relation flatten after execution  

**select**

- Select string  
- Supported fluent filters only (unsupported must not corrupt builder)  
- Chain each order  
- Apply limits  
- Resolve count from response  

### Shared behavior

- Default filter operator: `eq`  
- Multi-column order preserved; default direction ascending  
- Related columns group by relation name/schema/table; flatten without dropping values  
- Prefer `rowKey`; fallbacks must stay deterministic  
- **`page` / `pageSize`** own the per-request fetch window  
- **`query.limit`** is optional **total-row cap** (clamps `totalItems`, shortens last page) — not a second SQL LIMIT alongside page size  
- Debug AST when the client provides it  
- Query keys include client, query, page, pageSize, and any input that changes rows  
- Client is always v3 `createClient(...)` or a scoped view; hooks never construct clients  

### React layers

| Layer | API |
| --- | --- |
| auth-ui TanStack | `useAthenaQuery` / `useAthenaInfiniteQuery` (+ table aliases), optional `dataProxy` |
| composed | `useAthenaTableView` |
| SDK native | `@xylex-group/athena/react` `useAthenaReadQuery` |

### Data proxy route

`createAthenaTableQueryRoute({ authorize, getClient })` from `/tables` (or
route helpers). Always pass `authorize` in production. Use request-scoped
server Athena clients so org/user headers apply.

Example app routes: `src/app/api/data/**`, schema catalog
`src/app/api/tables/schema`.

## Sorting ownership

- **Client mode:** sort rows in the table with strategies.  
- **Server mode:** emit sorting state; query definition/executor orders records.  
- Persisted prefs normalize invalid entries and preserve priority.  
- Convert UI sorting ↔ Athena `orderBy` at **one** boundary
  (`sortingStateToOrderBy` / `orderByToSortingState`).  

## Portable table builder

Showcase + package builder share a portable config contract.

### Export shape (current)

- snake_case file-boundary fields  
- Table: `{ "schema_name": "public", "table_name": "case_tasks" }`  
- Column path: `schema_name`, `table_name`, `column_name`  
- Columns: stable `index`, `translation_key`, optional `chip`, format, sort strategy  
- Actions/filters: e.g. `open_in_new_tab`, `value_column_key`, `source_option_id`  
- Payload: `config_hash`, `config_seed`, versions for `@xylex-group/athena` and
  `@xylex-group/athena-auth-ui`  

### Import compatibility

Accept legacy camelCase keys and dotted `schema.table` / column paths.
Emit only the current normalized format on export.

### Change checklist

Update together:

1. Runtime builder state types  
2. Export serializer + hash/seed input  
3. Import normalizers + legacy compatibility  
4. Preview (hash/seed/version) + JSON snapshot  
5. Generated TSX (`buildGeneratedCode` / package codegen)  
6. localStorage persistence  
7. Unit tests + docs  

Keep React state camelCase when convenient; isolate snake_case at the file boundary.

### Package vs example

| Concern | Package | Example |
| --- | --- | --- |
| Preset types / normalize / serialize | `components/auth/table/builder/**` | re-export/wrap in `src/lib/table-showcase*.ts` |
| Codegen | `builder/codegen/**` | `src/lib/table-showcase-codegen/` |
| Catalog load | — | `src/lib/table-catalog.ts` + `/api/tables/schema` |
| Live builder UI | — | `use-table-showcase.ts` + `table-showcase-page.tsx` |
