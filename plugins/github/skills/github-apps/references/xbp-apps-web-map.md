# xbp `apps/web` GitHub auth map

Canonical site: `https://xbp.app` (`siteConfig` in `apps/web/src/lib/site-config.ts`).

## Environment variables

| Variable | Role |
|----------|------|
| `GITHUB_OAUTH_CLIENT_ID` | OAuth App — login |
| `GITHUB_OAUTH_CLIENT_SECRET` | OAuth App — login |
| `GITHUB_APP_CLIENT_ID` | GitHub App OAuth (user-to-server) |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App OAuth |
| `GITHUB_APP_ID` | App JWT / installation tokens |
| `GITHUB_APP_PRIVATE_KEY` | PEM for app JWT (normalize newlines) |
| `GITHUB_APP_SLUG` | Public install URL slug (e.g. `xbp-app`) |
| `GITHUB_WEBHOOK_SECRET` | Webhook HMAC |

Legacy fallbacks in `getGitHubAppAuthConfig`: `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
only for the **App** path, not OAuth login.

Typed on Worker env: `apps/web/worker-configuration.d.ts`, `apps/web/src/env.d.ts`.

## Provider IDs (D1 `account`)

| Constant | Value | Source module |
|----------|-------|---------------|
| `GITHUB_OAUTH_PROVIDER_ID` / `GITHUB_PROVIDER_ID` | `github` | `github-app.server.ts`, `d1-auth/github-oauth.server.ts` |
| `GITHUB_APP_USER_PROVIDER_ID` | `github-app` | `github-app.server.ts` |

## Routes

| Path | Purpose |
|------|---------|
| `/auth/sign-in/github` | Start OAuth App login redirect |
| `/api/callback/github` | OAuth App callback (+ CLI final redirect / setup branch) |
| `/api/auth/callback/github` | Proxied Better Auth path (internal) |
| `/api/github/app/authorize` | Start GitHub App user OAuth (session required) |
| `/api/github/app/callback` | GitHub App user OAuth callback |
| `/oauth/setup/github` | Setup helper → `/setup` (login if needed) |
| `/support/xbp-github-app` | Support page for the GitHub App |

## Key modules

| File | Responsibility |
|------|----------------|
| `src/lib/site-config.ts` | `GITHUB_OAUTH_CALLBACK_PATH = "/api/callback/github"` |
| `src/lib/auth-proxy-redirect.ts` | Sign-in proxy; `DEFAULT_GITHUB_OAUTH_SCOPES` |
| `src/lib/auth-redirect.ts` | Callback URL construction / safe redirects |
| `src/lib/d1-auth/github-oauth.server.ts` | `buildGitHubAuthorizeUrl`, `exchangeGitHubCode` (OAuth App) |
| `src/lib/d1-auth/handler.server.ts` | D1-native social sign-in handler |
| `src/lib/github-app.server.ts` | Dual config; OAuth account sync; App user exchange/refresh |
| `src/lib/github-app-server-only.ts` | Server-only wrappers |
| `src/lib/github-callback.ts` | Callback routing (setup vs final destination vs proxy) |
| `src/lib/auth-telemetry.ts` | Redact secrets in auth logs |

## Login flow (OAuth App)

```
Browser  GET /auth/sign-in/github?redirect=…
    → createGitHubSignInRedirectResponse
    → Better Auth / D1 social sign-in (scopes repo, read:org, user:email)
    → 302 https://github.com/login/oauth/authorize?client_id=<OAUTH>…
User consents
    → GET /api/callback/github?code&state&redirect=…
    → proxy to /api/auth/callback/github OR final destination / setup branch
    → session cookie + D1 account providerId=github
```

## App user OAuth flow (GitHub App)

```
Logged-in session required
GET /api/github/app/authorize?returnTo=/setup
    → cookies: github_app_oauth_state, github_app_oauth_return_to
    → 302 github authorize with GITHUB_APP_CLIENT_ID
GET /api/github/app/callback?code&state
    → validate state cookie
    → exchangeGitHubAppUserCode → D1 providerId=github-app
    → redirect returnTo
```

## Token resolution

- Dashboard user GitHub API as the user: prefer OAuth App token via
  `getGitHubAccessTokenByUserId` / `getGitHubOAuthAccountByUserId` (`providerId=github`).
- App user token path: `github-app` provider with refresh when `expires_in` is set.
- Installation automation: app JWT + installation access token (not the session cookie).

## Tests to touch

- `src/lib/auth-proxy-redirect.test.ts` — sign-in + CLI redirect
- `src/lib/auth-redirect.test.ts` — callback URL shapes
- `src/lib/auth-telemetry.test.ts` — secret redaction
- Component: `src/components/shared/github-sign-in-form-auth.test.ts`

## Wrangler / deploy notes

- Secrets must exist on the Worker that serves `xbp.app`.
- OAuth App callback registration must include production and any tunnel/dev hosts
  you actually use (`DEV_TUNNEL_URL` only if registered).
