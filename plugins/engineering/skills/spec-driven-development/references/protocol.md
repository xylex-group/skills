# Dual-suite proof template

Copy into `docs/sdd/<slug>.md` for each run.

## Spec

- **Title:**
- **Problem:**
- **Current behavior:**
- **Desired behavior:**
- **Acceptance criteria:**
  1. …
- **Out of scope:**
- **Risks:**
- **ADR:** needed? path?

## Protocol table

| Step | Expected | Actual | Evidence |
|------|----------|--------|----------|
| Spec written | yes | | path |
| Baseline suite on current code | **PASS** | | command + excerpt |
| Target suite on current code | **FAIL** | | command + excerpt |
| Implement | target **PASS** | | files + command |
| Baseline on new code | **FAIL** or additive-OK | | command |
| Docs / ADR | updated | | paths |
| Supersede baseline | retired **or** additive | | `supersede_kind` + booleans |
| Target still | **PASS** | | command |

### Supersede structured fields (workflow gate)

| Field | Meaning |
|-------|---------|
| `supersede_kind` | `delete` \| `move` \| `skip` \| `additive` |
| `baseline_retired` | true when delete/move/skip |
| `additive_baseline` | true when change is pure additive and baseline stays green |
| `baseline_not_green` | true unless additive path |
| `target_still_green` | must be true |

Success requires `target_still_green` and either (`baseline_retired` + `baseline_not_green`) or `additive_baseline`.

## Test layout suggestion

```text
test/sdd/<slug>.baseline.test.ts   # characterization
test/sdd/<slug>.target.test.ts     # desired behavior
```

Or language equivalents under the package’s test tree.

## Naming

- Baseline titles: `baseline: <current behavior fact>`
- Target titles: `target: <acceptance criterion>` or `P?: <subject>` when from reviews

## Telemetry (monitoring)

Runs emit `TELEMETRY|{json}` log lines and write `sdd-telemetry.json` / `.jsonl` to scratch (and durable `*-telemetry.json` next to the report when finalize succeeds). Correlate with `telemetry_run_id` / `run_id`. See [telemetry.md](telemetry.md).
