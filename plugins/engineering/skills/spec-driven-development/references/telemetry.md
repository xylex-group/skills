# SDD telemetry (monitoring)

Every `spec-driven-development` run emits structured telemetry so you can monitor phase progress, gates, agent health, budget, and token/duration sums.

## Args

| Arg | Default | Purpose |
|-----|---------|---------|
| `telemetry` | `true` | Master switch. `false` skips emit/record (still runs protocol). |
| `run_id` / `telemetry_run_id` | auto `sdd-<fp12>` | Correlation id for scrapers and multi-run dashboards. |
| `no_delta` / `allow_dual_green` | `false` | Characterization-only: allow target GREEN on current code (skip hard `target_red` abort). |

## Implementation note (Rhai)

Telemetry state is a map. Workflow `fn` arguments are **pass-by-value**, so every helper
returns the updated map and callers reassign:

```rhai
telem = telem_emit(telem, "phase", "Spec", #{});
telem = telem_record_agent(telem, "Spec", "sdd-spec", r, ());
telem = telem_gate(telem, "baseline_green", true, evidence);
```

Each emit also writes `sdd-telemetry-last.json` (latest event only) for a durable last-seen signal.
Gate maps are **copied per event** so historical rows do not all show the final gate state.

Agent token/duration fields are read from several host shapes (`tokens_used`, `usage.total_tokens`,
`metrics.*`, `duration_ms` / `elapsed_ms`, …).

## Channels (three surfaces)

### 1. Live logs (`TELEMETRY|…`)

Each event is one log line:

```text
TELEMETRY|{"seq":1,"run_id":"sdd-abc…","workflow":"spec-driven-development","kind":"run_start","phase":"Scope",…}
```

In Grok Build: open `/workflows` → select the run → stream. For external monitors:

```bash
# example: grep/jq against a captured workflow log
grep 'TELEMETRY|' workflow.log | sed 's/^TELEMETRY|//' | jq -c 'select(.kind=="gate")'
```

### 2. Scratch artifacts (always on success or fail-closed exit when telemetry on)

| File | Shape |
|------|--------|
| `sdd-telemetry.json` | Full snapshot: gates, budget, agent counters, event array |
| `sdd-telemetry.jsonl` | One event object per line (append-friendly for scrapers) |
| `sdd-report.md` | Human summary + embedded telemetry JSON block |

### 3. `complete()` payload

Fields on the workflow result:

- `telemetry` — full snapshot map
- `telemetry_run_id` — correlation id
- `telemetry_scratch` — path to `sdd-telemetry.json`
- `telemetry_path` — durable path under `report_dir` when finalize agent writes `<stem>-telemetry.json`

## Event kinds

| `kind` | When | What to watch |
|--------|------|----------------|
| `run_start` | After scope args | objective fingerprint, dry_run, max_iters |
| `phase` / `phase_start` / `phase_end` | Phase boundaries | progress bar / phase duration |
| `agent` | After every subagent | `detail.success`, `tokens_used`, `duration_ms`, `label` |
| `gate` | Protocol gates | `baseline_green`, `target_red`, `target_green`, `baseline_superseded` |
| `iterate` | Each repair loop | iter number + target status |
| `run_end` | Finalize | `verify_ok`, report paths |

## Gate map (boolean SSOT in snapshot)

```json
{
  "baseline_green": true,
  "target_red": true,
  "target_green": true,
  "baseline_superseded": true,
  "dry_run": false
}
```

A healthy full run ends with all four protocol gates `true` (except `dry_run` stays `true` when stopped after target-red).

## Counters on every event

- `agents_total` / `agents_ok` / `agents_fail`
- `tokens_used_sum` / `duration_ms_sum` (from agent results when host provides them)
- `budget.total` / `budget.spent` / `budget.remaining`
- `seq` — monotonic within the run
- `run_id` — same for all events in the run

## Monitoring recipes

**Is the run stuck?** Last `kind` should advance through Scope → Spec → BaselineGreen → TargetRed → Implement → DocsAdr → Iterate → Supersede → Finalize.

**Which gate killed it?** Latest `kind":"gate"` with `detail.passed":false` (or snapshot `reason` like `baseline_not_green`).

**Budget burn:** compare `budget.spent` across `agent` events; fail-closed exits still write snapshot with `reason`.

**Token cost:** sum `detail.tokens_used` on `agent` events, or use `tokens_used_sum` on the final snapshot.

**Correlate with docs:** match `telemetry_run_id` / `run_id` to `docs/sdd/*-telemetry.json` and the protocol table in the SDD report.

## Disable

```text
workflow name=spec-driven-development
args: { "objective": "…", "telemetry": false }
```
