# Duplicate And Dead Code Audit

Date: `<yyyy-mm-dd>`  
Repo: `<path or name>`  
Run: `audit-and-shrink` · dry_run=`<bool>` · max_clusters=`<n>` · verify_ok=`<bool>`

This report summarizes the cleanup behavior that led to the current duplicate and dead-code inventory, then ranks remaining clusters by **refactor value** (not raw deletable lines alone).

## How This Audit Was Built

1. Establish live seams (entrypoints, routes, packages) before labeling anything dead.
2. Parallel explore: duplicate · dead_candidate · duplicate_plus_drift · architecture · hygiene · hotspots.
3. Rank with the audit-duplicate-dead-code rubric (runtime risk → breadth → savings → drift pressure → extraction readiness).
4. Measure: file counts, line footprint (separate from estimated savings), blame snapshot, git provenance.
5. Write this inventory; optionally implement top clusters; verify fail-closed; finalize landed/remaining tables.

## Provenance

| Commit | What changed | Signal |
| --- | --- | --- |
| `<sha>` | `<branch / subject>` | `<stat or dirty flag>` |

Post-implement diff (if any):

```
<git diff --stat>
```

## Live Seams

- `<route or package entry>`

## Cluster Inventory

| Cluster | Type | Files | Total lines | Estimated savings | Blame snapshot | Status |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `<id>` | `<duplicate \| dead_candidate \| duplicate_plus_drift \| …>` | `<n>` | `<n>` | `<n>` | `<owners>` | `<open \| fixed \| deferred \| already_clean>` |

Notes:

- **Total lines** = footprint of files in the cluster.
- **Estimated savings** = lines expected to disappear *after* consolidation (not footprint).

## Highest Value Remaining Refactors

1. `<cluster id>` — `<title>`  
   Reason note: `<why next>`

2. `<cluster id>` — `<title>`  
   Reason note: `<why next>`

## Already Landed In This Cleanup Series

| Cluster | Outcome | Reason it mattered |
| --- | --- | --- |
| `<id>` | `<fixed summary>` | `<why it mattered>` |

## Cluster Notes

### `<cluster-id>`

- Cluster: `<kind>`
- Why it exists: `<short>`
- Why it matters: `<short>`
- Live seam: `<path or n/a>`
- Evidence:
  - `<path>`
- Plan: `<consolidation plan>`
- Outcome: `<open \| fixed notes>`
- Tracker backfill: `n/a`

## Dropped / Out of Scope

- `<id>`: `<reason>`

## Explore Dimension Summaries

- duplicate: `…`
- dead: `…`
- drift: `…`
- architecture: `…`
- hygiene: `…`
- hotspots: `…`

## Verification

- **ok**: `<bool>`
- **summary**: `<text>`
- **commands**:
  - `` `<cmd>` ``
- **failures**:
  - `<if any>`

## Implementation Detail

### `<cluster-id>` — `<status>`

- Notes: `…`
- Files: `…`
- Tests: `…`
- Line delta (estimate): `<n>`
