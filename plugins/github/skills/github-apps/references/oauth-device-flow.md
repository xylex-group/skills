# OAuth device flow (GitHub)

For **headless / CLI** clients without a reliable browser redirect (RFC 8628).
GitHub documents this under OAuth app authorization as the device flow.

## When to use

- CLI tools (`xbp` browser handoff is different: it opens a browser to
  `/auth/sign-in/github` on the web app — that is **web** flow, not device flow).
- True headless environments where you show a user code and poll.

## High-level steps

1. Request device + user codes from GitHub.
2. Display `user_code` and `verification_uri` to the user.
3. Poll token endpoint until authorized, denied, or expired.
4. Store access token securely; never print it in CI logs.

## Device code request

```
POST https://github.com/login/device/code
```

Typical body params: `client_id`, optional `scope` (OAuth App).

Response includes:

- `device_code`
- `user_code`
- `verification_uri` (and sometimes `verification_uri_complete`)
- `expires_in`
- `interval` (minimum poll interval in seconds)

## Token poll

```
POST https://github.com/login/oauth/access_token
```

With `client_id`, `device_code`, `grant_type=urn:ietf:params:oauth:grant-type:device_code`.

Handle:

| Error | Action |
|-------|--------|
| `authorization_pending` | Keep polling at `interval` |
| `slow_down` | Increase interval (e.g. +5s) |
| `expired_token` | Restart device flow |
| `access_denied` | Stop; user rejected |
| success | Persist `access_token` |

## Security

- `client_secret` may be optional for public native clients depending on registration;
  still never embed secrets in distributed binaries when avoidable.
- Prefer short-lived tokens / GitHub App patterns for automation over long-lived
  device tokens with broad scopes.
