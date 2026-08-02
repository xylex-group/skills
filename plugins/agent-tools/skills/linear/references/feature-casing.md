# Feature Casing

Use this reference when the user wants a larger feature or initiative broken into a parent Linear issue plus an execution-ordered child issue tree.

## Core shape

Start with one parent issue that explains why the work exists and what "done" means. Then create child issues only for implementable seams.

Use this parent structure:

```md
## Goal

One concise paragraph describing the capability being added.

## Required outcome

- user-visible or contract-level outcome
- compatibility expectation
- safety or tenancy constraint
- operational or ownership boundary

## Constraints

- compatibility or migration rule
- schema or API contract rule
- validation or security rule
- repo-specific implementation rule

## Execution order

1. first foundational seam
2. next dependency seam
3. docs, regression, or API lock-down seam
4. UI or consumer seam
5. final validation or sync seam
```

Parent issue rules:

- Keep it outcome-first, not implementation-first.
- Put only global constraints in the parent. Push seam-specific details into the child issues.
- Include execution order only when the work is order-dependent or spans multiple surfaces.
- Preserve exact identifiers from the source material, such as event names, routes, schemas, table names, env vars, and payload fields.

## Child issue structure

Use this child structure:

```md
## Goal

One concise paragraph describing the seam-specific deliverable.

## Scope

- concrete contract, persistence, service, UI, or docs changes
- named repos, packages, crates, or route families when relevant
- compatibility or migration guardrails

## Acceptance criteria

- observable outcome that proves the seam is complete
- compatibility expectation or failure mode
- explicit contract or tenancy behavior when relevant

## Validation

- targeted tests
- route or payload verification
- focused regression coverage
```

Child issue rules:

- Make every child independently actionable.
- Keep the issue scoped to one primary seam when possible: contract, persistence, resolver, API boundary, UI, docs, or final validation.
- Mention the exact surfaces involved when the title alone is not enough.
- Keep scope bullets implementation-focused and acceptance bullets outcome-focused.
- Call out compatibility requirements directly when existing payloads or templates must keep working.
- Call out fail-closed behavior directly for auth, tenancy, security, or data isolation work.

## Decomposition heuristics

Use a parent issue when any of these are true:

- the work spans multiple repos, packages, crates, or services
- contract and consumer changes must land in sequence
- backend, API, docs, and UI all need coordinated changes
- there are meaningful blocker edges

Use child issues that usually map to seams like:

1. contract and persistence
2. shared resolver or service logic
3. flow integration across existing send or request paths
4. API validation, docs, and regression coverage
5. UI or SDK consumer updates
6. final docs sync or release validation

Do not force the exact count above. Use the smallest set that still preserves execution clarity.

## Ordering and dependency rules

- Prefix titles with `[1]`, `[2]`, `[3]`, and so on when the order matters.
- Put the surface name immediately after the numeric prefix, for example `[2] auth-email: implement tenant-safe resolver`.
- Create the parent issue first.
- Create child issues in execution order.
- Add blocker links immediately after each child exists.
- If issue `[3]` cannot land before `[2]`, set `[3]` as blocked by `[2]`.
- If one child is documentation or regression work that depends on completed contract behavior, place it after the implementation issues.
- If the UI depends on backend payload shape, place UI after the backend contract and API validation issues.

## Title patterns

Prefer action-oriented titles:

- Parent: `<capability> with <primary constraint or safety boundary>`
- Child: `[n] <surface>: <deliverable>`

Examples:

- `Support sourced email template variables with tenant-safe server-side routing`
- `[1] auth-email: add structured template variable bindings to backend contracts and persistence`
- `[2] auth-email: implement tenant-safe server-side variable resolver`
- `[4] auth-ui: support structured email template variable bindings in Athena Auth UI`

## Quality bar

- Do not create a vague child like `finish backend`.
- Do not hide acceptance criteria in prose paragraphs.
- Do not leave validation implied; spell out the narrowest reliable check.
- Do not mix unrelated seams into one child just to reduce issue count.
- Do not create blockers without reading whether a matching parent or child already exists.
