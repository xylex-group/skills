# GitHub App vs OAuth App

Both use OAuth 2.0. GitHub recommends GitHub Apps for most new integrations, but
**xbp.app login intentionally uses a classic OAuth App** for a minimal, familiar
user sign-in path.

## Comparison (operator-facing)

| | OAuth App | GitHub App |
|--|-----------|------------|
| Primary xbp use | **User login** on xbp.app | Installations, webhooks, automation, optional app-user OAuth |
| Permissions model | Classic **scopes** (`repo`, `user:email`, …) | Fine-grained **permissions** + optional user permissions |
| Acts as | Authorizing user | App itself **or** user (user-to-server) |
| Token lifetime | Often long-lived user tokens (`gho_`) | Short-lived installation / expiring user tokens + refresh |
| Repo access control | Broad scope-based | Installation-scoped; user picks repos |
| Best for | Identity + user API as that user | Bots, org installs, webhooks, least privilege |

## Token types (GitHub App API)

| Token | Who | Typical use |
|-------|-----|-------------|
| **JWT** (app) | App identity | Request installation tokens; app-level APIs |
| **IAT** installation access token | App on an installation | Automation without user present |
| **UAT** user access token | User who authorized the app | User-to-server API with user’s rights ∩ app permissions |

Many REST endpoints document required access and whether **UAT**, **IAT**, or both
work. Prefer IAT for background jobs; UAT only when the action must be attributed
to a user.

## When xbp should use which

```
Need "Sign in with GitHub" for dashboard session?
  → OAuth App (GITHUB_OAUTH_*) → providerId "github"

Need install webhook / bot on repos?
  → GitHub App (GITHUB_APP_ID + private key) → IAT

Need extra user-to-server grant after login (setup)?
  → GitHub App OAuth (/api/github/app/*) → providerId "github-app"
```

## Scopes vs permissions

- **OAuth App**: request scopes on authorize (`scope=repo read:org user:email`).
- **GitHub App**: configure permissions in the app settings; user sees permission
  grants, not classic scope strings. Do not assume OAuth scopes apply to app UATs.

## Common pitfalls

1. Using GitHub App client id for Better Auth / D1 OAuth login path.
2. Assuming OAuth App tokens expire like GitHub App UATs (they usually do not).
3. Calling installation-only endpoints with a user OAuth token (or reverse).
4. Expanding OAuth scopes instead of adding a GitHub App permission for a bot task.
