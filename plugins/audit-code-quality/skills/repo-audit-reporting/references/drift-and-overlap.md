# Drift And Overlap Reports

Use this report family for:

- duplicate plus drift inventories
- local fork vs installed package overlap
- "biggest blast zones" cleanup reports
- "what should be replaced first" writeups

If the user is asking more about development drag, production blockers, or code-deletion order than about duplication itself, switch to [choke-points-and-reduction.md](choke-points-and-reduction.md).

## What to inspect

- live import sites
- local seam vs package export surface
- duplicate helpers with slightly different policies
- adapter code that should stay local
- stale or unused wrappers beside the live seam

## Recommended structure

1. `Executive Summary`
2. `How This Audit Was Built`
3. `Provenance`
4. `Cluster Inventory`
5. `Highest Value Remaining Refactors`
6. `Already Landed In This Cleanup Series` when relevant
7. `Cluster Notes`

## Cluster statuses

- `Active runtime seam`: production code path in use now
- `Adapter seam`: local code that still owns app-specific policy
- `Duplicate plus drift`: overlapping behavior with meaningful divergence
- `Legacy but still present`: old route or wrapper still shipped but not on the main path
- `Dead candidate`: no active consumers found in the current pass

## Cluster table columns

Use this table when the report is reduction-oriented:

| Cluster | Type | Files | Total lines | Estimated savings | Blame snapshot | Status |
| --- | --- | ---: | ---: | --- | --- | --- |

## Package-overlap notes

When comparing a local fork to an installed package:

- trace production imports first
- compare against the published export surface, not random internal package paths
- separate direct duplication from app-specific wrappers
- call out package-only capabilities that already drifted ahead
- say which wrappers likely stay local after package adoption

## Ranking rule

Rank by refactor value, not only by line count. Small active seams near auth, storage, routing, or app startup can outrank larger but lower-risk duplicate UI surfaces.
