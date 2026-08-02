# PR comment title → test mapping (Athena examples)

Convention: test title = `P{n}: {review subject}`.

## packages/athena-js

**File:** `packages/athena-js/test/cloudflare-review-regression.test.ts`

| Review subject | Test title |
|----------------|------------|
| Preserve resource_id filters on D1 deletes | `P1: Preserve resource_id filters on D1 deletes` |
| Resolve bounded mutations without assuming an id column | `P1: Resolve bounded mutations without assuming an id column` |
| Reject partial unique indexes as mutation identities | `P1: Reject partial unique indexes as mutation identities` |
| Reject nullable unique columns as mutation identities | `P1: Reject nullable unique columns as mutation identities` |
| (support) Accept full-table unique index | `P1: Accept full-table unique index as mutation identity` |

Other Cloudflare P1/P2 subjects in the same file follow the same pattern.

## apps/web progressive DDL

**Files:**

- `apps/web/app/lib/__tests__/ddlJob.test.ts`
- `apps/web/app/lib/__tests__/ddlProgressive.test.ts`

| Review subject | Test title |
|----------------|------------|
| Export table constraints in progressive DDL | `P1: Export table constraints in progressive DDL` |
| Order progressive relations by dependencies | `P2: Order progressive relations by dependencies` |
| Dependency-order base tables before emitting foreign keys | `P2: Dependency-order base tables before emitting foreign keys` |
| Preserve global FK order when grouping by schema | `P2: Preserve global FK order when grouping by schema` |
| Defer foreign keys for dependency cycles | `P2: Defer foreign keys for dependency cycles` |
| Exclude identity-owned sequences from standalone sequence DDL | `P2: Exclude identity-owned sequences from standalone sequence DDL` |
| Follow array element types when ordering composites | `P2: Follow array element types when ordering composites` |
| Emit functions before table defaults that call them | `P2: Emit functions before table defaults that call them` |

## create-athena-app

**File:** `packages/create-athena-app/test/env-collect.test.ts`

| Review subject | Test title |
|----------------|------------|
| Merge flow-style release-age exclusions | `P2: mergePnpmWorkspaceSettings merges flow-style release-age exclusions` |

Prefer renaming that suite entry to exact `P2: Merge flow-style release-age exclusions` when next touched.
