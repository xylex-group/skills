# Athena Auth Request Pipeline

Use this reference when the reported bug is "wrong route," "wrong handler,"
"Axum behaves differently," or "what is the real runtime seam?"

## Source of truth order

1. `athena-auth/docs/contracts/handleRequestAthenaAuth.md`
2. `athena-auth/src/core/auth.rs`
3. `athena-auth/src/handlers/axum.rs`
4. `athena-auth/crates/core/src/extractors.rs`
5. `athena-auth/tests/axum_integration_tests.rs`
6. `athena-auth/tests/axum_route_matrix_tests.rs`
7. `athena-auth/athena-auth.yaml`
8. `athena-auth/openapi.yaml`

If docs and implementation disagree, trust `src/core/auth.rs`,
`src/handlers/axum.rs`, and the matching tests.

## Quick grep

```powershell
rg -n "handle_request|handle_request_inner|base_path|disabled_paths|create_plugin_handler|register_route" src tests
rg -n "AuthRequestExt|FromRequest|from_parts" crates/core/src/extractors.rs
rg -n "get-session|revoke-session|api-key/verify" tests/axum_integration_tests.rs tests/axum_route_matrix_tests.rs
```

## Request flow

Start here:

1. `AthenaAuth::handle_request`
2. base-path stripping and disabled-path checks
3. plugin `before_request`
4. core or plugin route dispatch
5. standardized error shaping
6. middleware `after_request`

Important contract points from `handleRequestAthenaAuth.md`:

- caller-supplied virtual session state is discarded at the public entry point
- configured `base_path` is stripped before disabled-path checks and plugin routing
- plugin dispatch gets first handling opportunity when both core and plugin routes match
- unmatched routes become standardized 404 JSON
- unauthenticated or session-not-found requests that carried the session cookie may emit a clearing `Set-Cookie`

## Axum seam

Inspect `src/handlers/axum.rs` when the report mentions:

- `/auth/...` paths
- mounted base paths
- route registration drift
- handler not mounted
- different behavior between direct `handle_request(...)` and Axum

Key points:

- Axum registration skips disabled paths at mount time
- the core runtime also enforces disabled paths for non-Axum callers
- plugin routes are registered from the plugin list and can own paths before core assumptions

## Session extraction seam

Inspect `crates/core/src/extractors.rs` when the issue is about:

- converting HTTP requests into `AuthRequest`
- bearer headers not arriving
- cookies disappearing
- query/body/header mismatch between Axum and direct tests

`AuthRequestExt` is the seam for converting Axum requests into the runtime request shape.

## What not to do

- Do not assume the SDK route shape is the same thing as the runtime path after base-path normalization.
- Do not patch consumer code until you confirm whether Axum, direct runtime, or plugin dispatch is the real mismatch.
- Do not treat architecture diagrams as source of truth when they disagree with current route registration or tests.

## Validation

Use WSL2 for Rust tests on this machine.

Useful targeted commands:

```powershell
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test --test axum_integration_tests get_session"
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test --test axum_route_matrix_tests api_key"
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test --test axum_route_matrix_tests revoke_session"
```

If the behavior differs only in Axum, prefer Axum tests over direct plugin unit tests.
