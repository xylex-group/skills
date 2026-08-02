# Choke Points And Reduction Reports

Use this report family for:

- "what slows development down most" audits
- production-blocker reviews
- "what should we delete or canonicalize first" writeups
- "why is adding a new table/page/feature expensive" reports
- Athena/query ownership reduction plans
- terminology-overload audits where one word names multiple live seams

## What to inspect

- canonical client, service, and storage ownership seams
- duplicate factories or wrappers that force callsites to choose between multiple paths
- oversized runtime files that still own transport, SQL, or orchestration details
- page-construction seams such as table frameworks vs page-local shells
- TODO or XXX comments that already admit a seam is a shim, fallback, or duplicate
- stale docs when they materially change how a feature is reasoned about

## Questions to answer

- What most slows a developer down when adding a new page, table, or feature here?
- Which seam forces repeated architecture decisions that should already be settled?
- Which cluster is the biggest production blocker right now?
- Which code can be deleted or collapsed without removing behavior?
- Which local seams are legitimate adapters and which are duplicate drift?

## Recommended structure

1. `Executive Summary`
2. `How This Audit Was Built`
3. `Provenance`
4. `Cluster Inventory`
5. `Highest Value Remaining Refactors`
6. `Already Landed In This Cleanup Series` when relevant
7. `Production Blockers`
8. `Recommended Reduction Sequence`
9. `Cluster Notes`

## Ranking axes

Rank clusters by a blend of:

- development drag
- ownership ambiguity
- runtime criticality
- code footprint
- production risk
- code-deletion leverage

Do not rank by line count alone. A smaller active auth, storage, routing, or table-composition seam can outrank a larger but lower-risk duplicate UI cluster.

## Cluster table columns

Use this table when the report is reduction-oriented:

| Cluster | Type | Files | Total lines | Estimated savings | Blame snapshot | Status |
| --- | --- | ---: | ---: | --- | --- | --- |

## Blocker rules

- Call something a production blocker only when it materially affects correctness, ownership, observability, rollout confidence, or the repo's ability to ship safely.
- Separate repo-health blockers such as non-green typecheck from architecture blockers such as unresolved storage ownership.
- Distinguish `active runtime seam with drift`, `adapter seam with duplicate drift`, and `legacy but still present` instead of flattening everything into `duplicate`.

## Reduction-sequence rule

- Prefer the sequence that deletes the most ambiguity first, not the sequence with the easiest cosmetic wins.
- Canonicalize client, storage, or transport ownership before polishing downstream wrappers.
- Call out "already landed" reductions so the report does not overstate backlog that is already shrinking.

## Terminology-overload note

When the same word names multiple live seams:

- separate the meanings into explicit clusters
- identify which meaning is legacy data-source ownership versus ordinary JSON payload/body usage
- call out stale documentation if it still reflects the older meaning
