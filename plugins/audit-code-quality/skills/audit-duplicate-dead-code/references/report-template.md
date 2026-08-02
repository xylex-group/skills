# Duplicate And Dead Code Audit

Date: `<yyyy-mm-dd>`

This report summarizes the cleanup behavior that led to the current duplicate and dead-code inventory in `<repo>`, then ranks the remaining clusters by refactor value instead of raw deletable lines alone.

## How This Audit Was Built

1. Start from the relevant cleanup commits or current repo head.
2. Use `rg`, route tracing, import tracing, and side-by-side comparison to find duplicate or dead-code clusters.
3. Confirm the live seam before labeling anything dead.
4. Treat `Duplicate + drift` as a distinct, higher-value class.
5. Measure cluster footprint with file count, total lines, and blame ownership.
6. Rank by refactor value instead of only line count.

## Provenance

| Commit | What changed | Signal |
| --- | --- | --- |
| `<sha>` | `<summary>` | `<files/insertions/deletions>` |

## Cluster Inventory

| Cluster | Type | Files | Total lines | Estimated savings | Blame snapshot | Status |
| --- | --- | ---: | ---: | --- | --- | --- |
| `<name>` | `<type>` | `<n>` | `<n>` | `<estimate>` | `<owners>` | `<status>` |

## Highest Value Remaining Refactors

1. `<cluster>`
   Reason note: `<why this is the best next cleanup>`

2. `<cluster>`
   Reason note: `<why it comes next>`

## Already Landed In This Cleanup Series

| Cluster | Outcome | Reason it mattered |
| --- | --- | --- |
| `<cluster>` | `<what changed>` | `<why it mattered>` |

## Cluster Notes

### `<cluster>`

- Cluster: `<duplicate | dead candidate | duplicate plus drift>`
- Why it exists: `<short explanation>`
- Why it matters: `<short explanation>`
- Evidence:
  - `<path>`
  - `<path>`
- Tracker backfill: `<issue or n/a>`

## Tracker Backfill

- `<issue>` `<title>`
