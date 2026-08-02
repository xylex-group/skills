---
name: spec-driven-development
description: >
  Spec-first dual-suite TDD: write a specification, add characterization tests that
  PASS on the current implementation, add a second suite that FAILS on current code
  for the desired behavior, implement until targets pass, write ADRs/docs, supersede
  baseline tests. AUTO-RUN global workflow spec-driven-development when the user asks
  for SDD, dual-suite TDD, or /spec-driven-development /sdd.
---

# Spec-driven development (SDD)

Global skill + workflow for **spec-first dual-suite TDD**.

## Auto-run

When the user wants this protocol (not a pure explanation), launch:

```text
workflow name=spec-driven-development
args: {
  "objective": "<what to change and why>",
  "root": "<optional package path>",
  "dry_run": false,
  "await_user": false,
  "max_iters": 3,
  "report_dir": "docs/sdd",
  "telemetry": true,
  "run_id": "<optional correlation id>",
  "no_delta": false
}
agent_budget: 48
```

- Spec + dual-suite proof only → `"dry_run": true`
- Human gate after red/green proof → `"await_user": true`
- Disable metrics → `"telemetry": false`

Tell the user the run is in `/workflows`. On completion report: `spec_path`, baseline GREEN proof, target RED proof, implement evidence, supersede action, `report_path`, **`telemetry_run_id`**, and gate snapshot.

## Telemetry / monitoring

Built into the workflow (default **on**). Three surfaces:

1. **Live logs** — lines `TELEMETRY|{json}` (grep/jq friendly) in `/workflows`
2. **Scratch** — `sdd-telemetry.json` (full snapshot) + `sdd-telemetry.jsonl` (one event per line)
3. **Result** — `complete().telemetry` + `telemetry_run_id` + durable `<report>-telemetry.json` when finalize writes it

Track: phase progress, dual-suite **gates** (`baseline_green` / `target_red` / `target_green` / `baseline_superseded`), agent ok/fail counts, budget spent/remaining, token and duration sums.

See [references/telemetry.md](references/telemetry.md).

## Hard protocol (order is mandatory)

```text
Spec (no product feature code)
  → Baseline suite GREEN on CURRENT code
  → Target suite RED on CURRENT code
  → Implement product code
  → Docs + ADR (if needed)
  → Iterate until Target GREEN
  → Prove Baseline FAILS or is additive-documented
  → Supersede Baseline (delete / move / skip)
  → Target still GREEN
```

### Suite meanings

| Suite | Purpose | On old code | On new code | After supersede |
|-------|---------|-------------|-------------|-----------------|
| **Baseline** | Characterization of *current* behavior | **PASS** | **FAIL** (if behavior changed) or still pass if additive | Retired — not the CI gate |
| **Target** | Desired behavior / acceptance | **FAIL** | **PASS** | **Only active suite** |

### Supersede rules

Baseline must not remain the silent source of truth:

1. Prefer **delete** baseline files after noting them in the SDD report, or  
2. **Move** to `**/superseded/` / `*.baseline.superseded.*`, or  
3. **Skip** with message `superseded by target suite <paths>`.

CI must not keep running baseline as required green for old behavior.

## Manual agent checklist (if not using workflow)

1. Write `docs/sdd/<slug>.md` (problem, current, desired, acceptance, risks, ADR?).  
2. Add baseline tests → run → must pass.  
3. Add target tests → run → must fail.  
4. Implement.  
5. Target pass; baseline fail (or document additive).  
6. ADR/docs.  
7. Supersede baseline.  
8. Final target pass only.

## ADR / docs

- Set `adr_needed` when the change alters architecture, public contracts, storage routing, auth, or cross-package seams.  
- ADR location: project `docs/adr/` (or existing ADR tree).  
- Update user-facing docs/contracts that would otherwise lie.

## Fail-closed gates

Abort (do not implement) if:

- Baseline cannot be made green on current code, or  
- Target cannot be made red for the right reason on current code, or  
- Target never turns green within `max_iters`.

## Workflow location

- Global: `~/.grok/workflows/spec-driven-development.rhai`  
- Project copy (optional share): `.grok/workflows/spec-driven-development.rhai`

## References

- [references/protocol.md](references/protocol.md) — dual-suite proof table template  
- [references/telemetry.md](references/telemetry.md) — monitoring channels, event kinds, scrapers  
- Related: `test-driven-development`, `verification-before-completion`, `athena-js-sdk-cleanup`
