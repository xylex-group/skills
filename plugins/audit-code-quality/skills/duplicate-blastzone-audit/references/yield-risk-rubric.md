# Yield and Risk Rubric

Score each function cluster on two independent axes (1–5). Use judgment; do not sum into a single number without explaining tradeoffs.

## Yield (payoff if consolidated)

| Score | Label | Signals |
|------:|-------|---------|
| 5 | Very high | Many callers across packages; large line footprint; obvious shared helper; active drift between copies |
| 4 | High | Broad surface (3+ modules) or 80+ duplicate lines; clear extraction seam |
| 3 | Medium | 2–3 copies, moderate lines; consolidation reduces future drift pressure |
| 2 | Low | Small helpers; consolidation saves <30 lines; few callers |
| 1 | Minimal | Tiny wrapper; bundle with adjacent work instead of standalone PR |

### Yield boosters

- Same lifecycle repeated in 5+ places (validate, fetch, map, toast)
- Copies already diverging (`Duplicate + drift`)
- Canonical target obvious and on live seam
- Tests exist on one copy and can move wholesale
- Generated or docs surfaces will simplify after merge

### Yield dampeners

- Only one caller per copy (isolation suggests intentional boundary)
- Consolidation requires redesign, not extraction
- "Duplicate" is actually protocol translation (keep explicit mapper)

## Risk (danger if merged now)

| Score | Label | Signals |
|------:|-------|---------|
| 5 | Critical | Auth, payments, permissions, data loss, production flags, untested live path |
| 4 | High | Wide blast zone (10+ caller files); weak test coverage; cross-crate/public API change |
| 3 | Medium | Several callers; behavior differs subtly between copies; needs characterization tests |
| 2 | Low | Internal module; good test coverage; mechanical rename/repoint |
| 1 | Minimal | Dead candidate or test-only duplicate; no production callers |

### Risk boosters

- Copies behave differently and no test documents which is correct
- Blast zone includes CLI defaults, env loading, or startup/bootstrap
- Cross-repo or published package API
- No integration test on the live seam
- Merge touches hot path with high change velocity (frequent edits)

### Risk dampeners

- Dead candidate confirmed by caller trace
- Exact duplicate with identical tests
- New shared helper behind old symbols (facade migration)
- Feature-flagged or isolated incubation crate

## 2×2 Action Matrix

| | Low risk (1–2) | High risk (3–5) |
|---|----------------|-----------------|
| **High yield (4–5)** | **Start here** — extract/merge in first PR | Stage: characterize tests first, then merge in phase 2 |
| **Low yield (1–2)** | Bundle with nearby refactor | Defer unless blocking drift fix |

## Ranking order (final backlog)

Sort clusters by:

1. `Duplicate + drift` on live seam (regardless of line count)
2. High yield + low/medium risk (start-here candidates)
3. High yield + high risk (planned phases with test gates)
4. Exact duplicate + low risk (quick wins)
5. Similar + medium yield (policy merge or shared core)
6. Dead candidates (delete after re-verify)
7. Low yield + any risk (bundle or defer)

## Start Here selection

Pick exactly one cluster for the first PR when the user asks "where to start":

- Yield ≥ 4 and Risk ≤ 2, **or**
- Yield ≥ 3 and Risk ≤ 2 with clear canonical on live seam, **or**
- Smallest `Duplicate + drift` on a user-named hot seam (even if yield is 3)

First PR scope should include:

- canonical function (new or existing)
- repoint callers in **one** bounded package/module
- tests moved or added
- **not** entire blast zone in one PR unless risk ≤ 1