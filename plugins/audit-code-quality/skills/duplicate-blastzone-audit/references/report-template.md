# Duplicate Blastzone Audit Report

Copy this skeleton. Replace placeholders. Keep tables sortable by yield/risk.

---

# {Title}: Duplicate Function Blastzone Audit

**Date:** {YYYY-MM-DD}  
**Repo:** {name}  
**Commit:** `{git rev-parse --short HEAD}` — {subject}  
**Scope:** {one paragraph: what seam, what was excluded}

## Executive Summary

{3–5 sentences: cluster count, biggest blast zone, drift hotspots, recommended direction}

### Start here

| Field | Value |
|-------|-------|
| **Cluster** | {name} |
| **Why first** | {yield/risk one-liner} |
| **Canonical target** | `{path::symbol}` |
| **First PR scope** | {exact repoint/delete boundary} |
| **Exit check** | {test command or smoke step} |

## How This Audit Was Built

- Live seam: {entrypoint traced}
- Discovery: {symbol search, signature match, behavior compare}
- Blast zone: {caller trace method}
- Scoring: [yield-risk-rubric.md](yield-risk-rubric.md)

## Function Cluster Inventory

| Rank | Cluster | Type | Symbols | Copies | Lines | Blast | Yield | Risk | Canonical |
|-----:|---------|------|---------|-------:|------:|-------|------:|-----:|-----------|
| 1 | {name} | duplicate+drift | `a`, `b` | 3 | 240 | Wide | 5 | 3 | `path::a` |
| 2 | … | … | … | … | … | … | … | … | … |

**Type values:** `exact duplicate`, `similar`, `duplicate+drift`, `dead candidate`

**Blast values:** `Narrow`, `Medium`, `Wide`, `Critical`

## Yield × Risk Matrix

```
                    low risk    high risk
high yield          [START]     [STAGE]
low yield           [BUNDLE]    [DEFER]
```

| Quadrant | Clusters |
|----------|----------|
| Start (high yield, low risk) | {list} |
| Stage (high yield, high risk) | {list} |
| Bundle (low yield, low risk) | {list} |
| Defer | {list} |

## Recommended Reduction Sequence

### Phase 1 — {title}

- **Clusters:** {names}
- **Goal:** {outcome}
- **Risk gate:** {tests/checks required before merge}
- **Exit criteria:** {measurable}

### Phase 2 — {title}

…

## Blast Zone Summary

### {Cluster name}

| Tier | Count | Notes |
|------|------:|-------|
| T1 Direct callers | {n} | {top paths} |
| T2 Entry surfaces | {n} | {routes/commands} |
| T3 Tests | {n} | {gaps} |
| T4 Generated | {n} | {artifacts} |
| T5 Docs | {n} | {stale refs} |

**Drift note:** {how copies differ}

**Merge plan:** {extract | repoint | delete | mapper}

---

{Repeat per cluster}

## Cluster Notes

### {Cluster name}

- **Symbols:** `fn foo` @ `a.rs:10`, `fn foo` @ `b.rs:44`
- **Evidence:** {why classified as duplicate+drift}
- **Blame:** {optional git blame snapshot}
- **Blockers:** {missing tests, unclear authority}
- **Tracker:** {suggested issue title}

## Already Landed / Out of Scope

- {consolidations already done}
- {paths excluded from audit}

## Tracker Backfill

| Priority | Title | Cluster | Yield | Risk |
|---------:|-------|---------|------:|-----:|
| P0 | {title} | {name} | 5 | 2 |

---

*Generated with duplicate-blastzone-audit skill.*