# Env, Session, And Import Reports

Use this report family for:

- deep relative import drift
- alias contract inconsistency
- env fallback chain audits
- auth base URL or runtime config source-of-truth reports
- repeated `getServerSession()` and active-organization resolution audits

## What to inspect

- tsconfig alias contract
- deep relative imports and mixed alias shapes
- `process.env.* ??`, `||`, and config fallback chains
- repeated session and organization resolution patterns
- duplicated client/server config builders

## Recommended structure

1. `Methodology`
2. `Headline Numbers`
3. `Alias Contract Reality` when imports are involved
4. `Ranked Findings`
5. `Recommended Seam`

## Ranking rule

Rank findings by hidden runtime drift potential:

- auth/runtime config duplication
- parallel URL or env resolution
- caller-owned session/org policy
- inconsistent alias usage

## Evidence expectations

- show representative file clusters, not just grep counts
- explain where fallback ordering differs
- call out byte-for-byte duplicates separately from same-shape drift
- when organization/session policy differs across modules, say exactly which module ignores or prefers which field
