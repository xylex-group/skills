# Athena Auth Session, API Key, and Audit Seams

Use this reference when the task is about `/get-session`, `/api-key/verify`,
virtual API-key sessions, cache refresh, revoke flows, or admin audit truth.

## Source of truth order

1. `athena-auth/docs/auth/api-key/README.md`
2. `athena-auth/crates/caching-matrix/src/lib.rs`
3. `athena-auth/crates/api/src/plugins/api_key/mod.rs`
4. `athena-auth/crates/api/src/plugins/api_key/tests.rs`
5. `athena-auth/crates/api/src/plugins/admin/mod.rs`
6. `athena-auth/crates/api/src/plugins/admin/handlers.rs`
7. `athena-auth/crates/api/src/plugins/admin/tests.rs`
8. `athena-auth/tests/axum_integration_tests.rs`
9. `athena-auth/tests/axum_route_matrix_tests.rs`
10. `athena-auth/athena-auth.yaml`

If docs and implementation disagree, trust the plugin source and the targeted
tests.

## Quick grep

```powershell
rg -n "SessionUserCache|cache_session_user|invalidate|disableCookieCache" crates src tests
rg -n "api-key/verify|validate_api_key|KEY_NOT_FOUND|virtual /get-session|enable_session_for_api_keys" crates/api/src/plugins/api_key
rg -n "admin.has_permission|has_permission_audit_target|write_audit|target_type|target_id" crates/api/src/plugins/admin
```

## `/get-session` contract

When debugging `/get-session`, first determine which auth mode is active:

- bearer or cookie-backed user session
- API-key virtual session emulation
- Axum-mounted `/auth/get-session`
- direct runtime `/get-session`

Important contract:

- the response should reflect direct DB user updates immediately
- this includes role changes
- the Axum tests and API-key virtual-session tests both prove that contract

Start with:

- `tests/axum_integration_tests.rs`
- `crates/api/src/plugins/api_key/tests.rs`

## Session user cache seam

`crates/caching-matrix/src/lib.rs` defines `SessionUserCache`:

- default max capacity: `20_000`
- default TTL: `30s`
- operations: `get`, `insert`, `invalidate`

Treat this as a short-lived acceleration layer, not a stale-source-of-truth layer.
If the runtime contract says user updates should show up immediately, inspect
where `cache_session_user(...)` or `invalidate(...)` is called.

Look for refresh points in admin, oauth, and email-verification flows before
adding new cache behavior elsewhere.

## `/api-key/verify` and virtual sessions

Inspect `crates/api/src/plugins/api_key/mod.rs`.

Important rules:

- `POST /api-key/verify` uses `handle_verify(...)`
- `validate_api_key(...)` is the shared validation chain used by verify and API-key session emulation
- validation order is: exists, disabled, expired, permissions, remaining/refill, rate limit
- permission mismatch can intentionally surface as `KEY_NOT_FOUND`
- when `enable_session_for_api_keys` is on, non-`/api-key/*` requests can inject a session from the API key
- `/get-session` is special: it returns a virtual session response instead of injecting session state

Important proof tests in `crates/api/src/plugins/api_key/tests.rs`:

- virtual `/get-session` returns user and session-like data
- virtual `/get-session` re-reads the user after direct DB role changes
- `disableCookieCache` still returns the refreshed user in virtual `/get-session`

Do not break the `/get-session` special case when changing API-key handling.

## Revoke-session behavior

When the report mentions cookie cleanup or self-revoke behavior, inspect:

- `tests/axum_integration_tests.rs`
- `tests/axum_route_matrix_tests.rs`
- `architecture/session_revocation_cookie_invalidation_design.md`

Confirm whether the route is:

- `/revoke-session`
- `/revoke-sessions`
- `/revoke-other-sessions`

and whether the caller revoked the current session or another session.

## Admin audit seam

Inspect:

- `crates/api/src/plugins/admin/mod.rs`
- `crates/api/src/plugins/admin/handlers.rs`
- `crates/api/src/plugins/admin/tests.rs`

Important rules:

- audit writes live with the admin plugin behavior, not in a separate reporting layer
- `admin.has_permission` audit target data is derived by `has_permission_audit_target(...)`
- preserve `action`, `actor_user_id`, `target_type`, `target_id`, `success`, and `error_message`
- the tests assert the serialized permissions payload stored in `target_id`

If an audit fix changes user-facing behavior, prove both:

- runtime result body
- written audit row

## Validation

Use WSL2 for Rust tests on this machine.

Useful targeted commands:

```powershell
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test -p athena-auth-api virtual_session_on_get_session"
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test -p athena-auth-api has_permission"
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test --test axum_integration_tests get_session"
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test --test axum_route_matrix_tests api_key"
```

Prefer these narrow tests before broader workspace or benchmark runs.
