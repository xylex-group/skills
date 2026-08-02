# Ranking Rubric

Rank clusters by refactor value, not just raw deletable lines.

Use these dimensions:

1. Runtime risk
   Put live user-facing drift first. Public routes, submission flows, payments, and auth-adjacent behavior should outrank purely internal cleanup.

2. Surface breadth
   Prefer clusters that repeat the same lifecycle or plumbing across many files, sections, or packages.

3. Net savings
   Large, low-risk deletions matter, but should not outrank a live runtime bug seam on line count alone.

4. Drift pressure
   Raise the rank when multiple copies already behave differently or are likely to diverge further.

5. Extraction readiness
   Raise the rank when the shared seam is already obvious and the refactor can be staged safely.

6. Tracker fit
   Lower the rank for tiny clusters that should ride along with adjacent work instead of becoming standalone issues.

Use judgment over arithmetic. A public-flow `Duplicate + drift` cluster can outrank a much larger dead-code deletion candidate.
