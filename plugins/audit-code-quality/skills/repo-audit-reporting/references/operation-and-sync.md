# Operation And Sync Reports

Use this report family for:

- upload, rename, move, delete, fetch, or refresh operation maps
- subsystem "how does this work now" reports
- storage, queue, cache, or database synchronization writeups
- UI-to-store-to-API-to-service tracing

## What to inspect

- page entrypoints
- client composition files
- stores, hooks, and mutation wrappers
- API routes
- service and repository layers
- storage or external system adapters
- refresh, refetch, invalidate, or local merge behavior after mutations

## Recommended structure

1. `Executive Summary`
2. `Entry Point`
3. `UI Surface Map`
4. `Live Operation Map`
5. `How State Stays Updated`
6. `Table Source Of Truth` or equivalent when relevant
7. `Current Gaps And Caveats`

## Operation mapping rule

For each operation, map:

- UI trigger
- client/store action
- HTTP route
- service or workflow function
- external side effect such as storage move, signed URL, or DB mutation
- resulting state refresh behavior

## Sync-analysis checklist

- say whether reads come from DB rows, object storage, cache, or client state
- say whether writes are optimistic, fully refetched, merged locally, or both
- call out stale-refetch guards or local preservation logic
- distinguish live routes from legacy but still present routes
- say explicitly when selection UI or bulk-action UI is present but not truly wired

## Use counts sparingly

Operational reports do not need line counts unless the user is asking for cleanup prioritization. Flow clarity matters more than footprint.
