# OAuth web application flow (GitHub)

Used by **OAuth Apps** and by **GitHub Apps user-to-server OAuth**. Implicit grant is
not supported.

## Steps

1. Redirect user to request GitHub identity.
2. GitHub redirects back with temporary `code` (+ `state`).
3. Server exchanges `code` for access token; call API with token.

## 1. Authorize

```
GET https://github.com/login/oauth/authorize
```

| Parameter | Required | Notes |
|-----------|----------|--------|
| `client_id` | Required | From app registration |
| `redirect_uri` | Strongly recommended | Must match registered callback |
| `scope` | Context-dependent | Space-delimited OAuth scopes (OAuth App). GitHub App user OAuth uses app permissions instead of classic scopes. |
| `state` | Strongly recommended | CSRF; unguessable random string |
| `login` | Optional | Suggest account |
| `code_challenge` | Strongly recommended | PKCE; 43-char base64url SHA-256 of verifier |
| `code_challenge_method` | With challenge | Must be `S256` (`plain` unsupported) |
| `allow_signup` | Optional | Default `true` |
| `prompt` | Optional | `select_account` forces account picker |

CORS preflight (`OPTIONS`) is not supported on authorize.

## 2. Callback

On accept, GitHub redirects to `redirect_uri` with:

- `code` — temporary, ~10 minutes, single-use
- `state` — must equal value you sent

If `state` mismatches, abort (CSRF).

## 3. Token exchange

```
POST https://github.com/login/oauth/access_token
```

| Parameter | Required | Notes |
|-----------|----------|--------|
| `client_id` | Required | |
| `client_secret` | Required | Server-only |
| `code` | Required | From callback |
| `redirect_uri` | Strongly recommended | Must match authorize step |
| `code_verifier` | If PKCE used | Original verifier for `code_challenge` |

Request `Accept: application/json` for JSON response.

Example success (OAuth App shape):

```json
{
  "access_token": "gho_…",
  "scope": "repo,gist",
  "token_type": "bearer"
}
```

GitHub App user tokens often also include `expires_in`, `refresh_token`, and
`refresh_token_expires_in`. Refresh with:

```
grant_type=refresh_token&refresh_token=…
```

plus app `client_id` / `client_secret`.

## Redirect URL rules

- Exact match against registered callbacks (scheme + host + path).
- Prefer HTTPS in production (`https://xbp.app/api/callback/github`).
- Localhost allowed for development when registered.

## xbp defaults

- Login callback: `/api/callback/github`
- Login scopes: `repo read:org user:email`
- App user callback: `/api/github/app/callback`
