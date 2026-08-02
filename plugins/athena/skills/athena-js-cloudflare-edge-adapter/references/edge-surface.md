# Edge adapter surface (quick contract)

## Config fields

### `AthenaDbConfig`

| Field | Role |
| --- | --- |
| `url` | HTTP gateway DB base (or sentinel when `d1` set) |
| `d1` | Cloudflare D1 binding → local transport |
| `sessionMode` | Default D1 session mode |
| `pgUri` / `jdbcUrl` | Gateway/direct SQL metadata (not D1) |

### `AthenaStorageConfig`

| Field | Role |
| --- | --- |
| `url` | HTTP storage base |
| `r2` | R2 binding → L3a object I/O |
| `prefix` | R2 key prefix |
| `directUpload` | HTTP direct upload (not R2 path) |

## Construction matrix

| Input | DB | Storage | Billing |
| --- | --- | --- | --- |
| `{ url, key }` | HTTP | HTTP (from root) | db/root |
| `{ db: { d1 } }` | D1 | unavailable unless r2/url | sentinel/unusable |
| `{ db: { d1 }, storage: { r2 } }` | D1 | R2 local | sentinel |
| `{ db: { d1 }, url, key }` | D1 | remote HTTP objects | **remote root** |
| `{ db: { d1 }, storage: { r2 }, url, key }` | D1 | R2 local | remote root |

## Fluent API parity

Same call sites on edge and gateway:

- `from(table).select/insert/update/delete`
- `query(sql)`
- `storage.putObject` / `getObject` / `listObjects` / `deleteObject` (R2 only)
- `capabilities`

Not on edge D1 (fail clearly / capability false):

- `rpc`
- nested relations / full findMany AST (until enabled)
- storage catalogs / backups on R2 module

## Mutation bounds

```ts
// Deletes at most 10 matching rows on D1 (rowid subquery)
await client.from('events').eq('expired', true).range(0, 9).delete()
```

Builder must put `limit`/`offset` on `AthenaDeletePayload` / update payload.

## Sparse insert counts

Batch without RETURNING → sum `meta.changes` for `count`.

## Capabilities sketch

```ts
// Edge D1 only
{ mode: 'cloudflare-edge', db: { local: true, engine: 'cloudflare-d1', layers: { query: true, flatCrud: true, rpc: false, relations: false } }, storage: { local: false, objects: false }, auth: { remote: false } }

// Hybrid url, no R2
storage: { local: false, objects: true }, auth: { remote: true }

// R2
storage: { local: true, objects: true }
```

## Sentinels

- `CLOUDFLARE_EDGE_BASE_URL = 'https://athena.local/cloudflare-edge'`
- `CLOUDFLARE_EDGE_API_KEY = 'cloudflare-edge-local'`

Never use sentinel as hybrid billing/auth HTTP base.

## Tests to prefer

- `test/cloudflare-client.test.ts` — drop-in createClient, hybrid, R2
- `test/cloudflare-transport.test.ts` — head, batch count, bounds
- `test/cloudflare-d1-sql.test.ts` — compiler fixtures
- `test/cloudflare-runtime.test.ts` — mode resolution
- `test/query-builder-behavior.test.ts` — delete/update limit payload
