# XBP dashboard error screen migration

Source: `apps/web/src/components/layouts/dashboard-error-screen.tsx`

## Current behavior to preserve

### Rate limiting

- Match: `rate limit` or `429` in message  
- Linear variant when message includes `linear`, `2500 requests`, or `api keys:`  
- Linear detail: use original message only if length in `(40, 600)`; else fixed explanation about 2,500 req/hour shared with MCP/CLI  
- Generic: “You've made too many requests…”  
- Action: `retry`  
- Icon: alert-circle, amber styling  

### Self-approve PR

- `isSelfApprovePullRequestReviewMessage` + `SELF_APPROVE_PULL_REQUEST_REVIEW_MESSAGE` from `#/lib/github-review-errors`  
- Title: “You can't approve this pull request”  
- Description: constant message  
- Action: `retry`  
- Detail line: suppress (same as not-found)  

### GitHub integration / notifications

- Match: `not accessible by integration` OR (`notifications` AND (`403` OR `forbidden`))  
- Title: “GitHub access needs review”  
- Action: `reauthorize-github-app`  

### Forbidden / permissions

- Match: `403`, `forbidden`, `insufficient permissions`  
- Title: “Access not configured”  
- Action: `configure-access`  
- Side effect: extract `` the `org` organization `` → `surfaceForbiddenOrgWarnings`  

### Bad credentials / 401

- Match: `bad credentials` or word-boundary `401`  
- Action: `reauthorize-github-app`  

### Not found

- Match: `404` or `not found`  
- Action: `go-home`  
- Presentation: **Logo** instead of icon  
- No mono detail line  

### Network

- Match: `network`, `fetch failed`, `econnrefused`, `enotfound`, `failed to fetch`  
- Action: `retry`  
- Icon: wifi-off  

### Timeout

- Match: `timeout`, `timed out`  
- Action: `retry`  

### Unknown

- Title: “Something went wrong”  
- Description: message or generic fallback  
- Action: `retry`  
- Icon: alert-circle, destructive styling  

## Non-registry UI responsibilities (stay in component)

- `cleanErrorMessage` (strip ` - GET https://…` Octokit suffix)  
- `recordClientDiagnosticError` (enrich with code/key after resolve)  
- `ConfigureAccessButton` / `ReauthorizeGitHubAppButton`  
- Router `invalidate` + `reset` on retry  
- Link to `/`, `/logs`, `/setup`  
- Org warning extraction from message  

## Suggested definition keys (examples)

| key | code sketch | notes |
|-----|-------------|--------|
| `rate_limit.generic` | `42900` | generic rate limit |
| `rate_limit.linear` | `42901` | Linear-specific copy |
| `github.pr.self_approve` | `40310` or non-HTTP if preferred | self-approve |
| `github.integration.inaccessible` | `40300` | integration access |
| `github.notifications.forbidden` | `40301` | notifications 403 |
| `github.forbidden` | `40302` | generic forbidden |
| `github.credentials.invalid` | `40100` | bad credentials |
| `github.reauthorize_required` | `40101` | reauth copy |
| `resource.not_found` | `40400` | 404 / not found |
| `network.failed` | `90000` | network class |
| `network.timeout` | `90001` | timeout |
| `app.unknown` | `90099` | fallback |

Adjust codes if repo already defines a convention; never renumber after ship without migration.

## Target component shape

```tsx
export function DashboardErrorScreen({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const resolved = applicationErrorRegistry.resolve(error);
  const presentation = dashboardErrorPresentationAdapter.toPresentation(resolved);
  // map presentation.icon → React icon; handle actions
}
```

## Diagnostics enrichment

```ts
recordClientDiagnosticError(error, pathname, {
  errorCode: resolved.code,
  errorKey: resolved.definition.key,
  provider: resolved.definition.provider,
  category: resolved.definition.category,
  severity: resolved.definition.severity,
});
```

Only if the diagnostics client API allows optional fields — extend types carefully without breaking callers.

## Tests to add

- Each migrated matcher resolves to the expected key/code  
- Linear rate-limit detail bounding  
- Self-approve suppresses detail  
- Not-found → go-home + logo path in presentation model  
- Unknown safe fallback  
- Secret-like messages redacted in normalize  
- validate() rejects duplicate codes  
