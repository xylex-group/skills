# Query and Builder Contracts

## Athena portable read query

`AthenaReadQueryDefinition` (alias `AthenaTableQueryDefinition`) owns columns, count column, filters, limit, mode, order, row key, schema, and table. Source of truth is `@xylex-group/athena` `executeAthenaReadQuery` (alias `executeAthenaTableQuery`). auth-ui re-exports for compat.

Preserve these mode-specific paths:

- `findMany`: build nested select and where objects, translate orderBy into SDK shape, request count, and flatten relations after execution.
- `select`: build the select string, apply supported fluent filter methods, chain each order, apply limits, and resolve count from the returned response.

Preserve the following behavior:

- Default filter operator is `eq`.
- Unsupported fluent filter methods do not corrupt the builder.
- Multi-column order remains ordered and defaults direction to ascending.
- Related columns group by relation name/schema/table and flatten arrays without discarding values.
- `rowKey` is preferred; fallback keys must remain deterministic enough for rendering.
- Query `limit` is an optional **total-row cap** (clamps `totalItems` and shortens the last page). It must not be applied as a second SQL LIMIT alongside `page`/`pageSize` — page size owns the per-request fetch window.
- Debug AST remains available when the Athena client provides it.
- Query keys include client/query/page/pageSize inputs that affect data.
- Client must be v3 `createClient(...)` (or scoped view); hooks never construct clients.
- React layers: auth-ui `useAthenaQuery` (TanStack + optional `dataProxy`); SDK `useAthenaReadQuery` (AthenaQueryClient only).

## Sorting ownership

- Client mode sorts rows in the table with configured strategies.
- Server mode emits sorting state and lets the query definition/executor order records.
- Persisted sorting preferences must normalize invalid entries and preserve priority.
- Convert between UI sorting state and Athena `orderBy` at an explicit boundary, not in multiple components.

## Portable table builder

The example table builder is a public demonstration and a portable config contract. Current output should use snake_case file-boundary fields and object paths:

- Table: `{ "schema_name": "public", "table_name": "case_tasks" }`.
- Column path: `schema_name`, `table_name`, and `column_name`.
- Columns include stable `index` and `translation_key`.
- Actions and filters use fields such as `open_in_new_tab`, `value_column_key`, and `source_option_id`.
- Payload includes deterministic `config_hash`, `config_seed`, and versions for `@xylex-group/athena` and `@xylex-group/athena-auth-ui`.

Importers should continue accepting legacy camelCase keys and dotted table/column paths. Exporters should emit only the current normalized format.

When changing the format, update together:

1. Runtime builder state types.
2. Export serializer and canonical hash/seed input.
3. Import normalizers and legacy compatibility.
4. Disabled hash/seed/version preview inputs and JSON snapshot.
5. Generated TSX code.
6. Local storage persistence.
7. Unit tests and docs.

Keep React state camelCase when convenient; isolate snake_case at the file boundary.
