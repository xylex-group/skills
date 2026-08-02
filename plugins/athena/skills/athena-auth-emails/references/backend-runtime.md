# Athena Auth Email Backend

Use this reference when the bug or feature lives in the `athena-auth` repo.

## Source of truth order

1. `athena-auth/docs/auth/admin/email/README.md`
2. `athena-auth/docs/auth/admin/email/template/README.md`
3. `athena-auth/docs/auth/admin/email/event-type/README.md`
4. `athena-auth/crates/api/src/plugins/admin/mod.rs`
5. `athena-auth/crates/api/src/plugins/admin/handlers.rs`
6. `athena-auth/crates/api/src/plugins/admin/types.rs`
7. `athena-auth/crates/api/src/plugins/admin/tests.rs`
8. `athena-auth/crates/core/src/email/templates.rs`
9. `athena-auth/crates/core/src/adapters/database.rs`
10. `athena-auth/athena-auth.yaml`

If docs and implementation disagree, trust `handlers.rs`, `types.rs`, and the
matching tests.

## Quick grep

```powershell
rg -n "MAX_ADMIN_JSON_BYTES|normalize_template_variables|email-template|email-event-type|x-athena-tenant" crates/api/src/plugins/admin
rg -n "required_variables|optional_variables|render_for_context|default_event_type_for_template_key" crates/core/src/email
rg -n "email_template|email_event_type|email_failure" crates/api/src/plugins/admin/tests.rs
```

## Route families

Sent email records:

- `GET /admin/email/list`
- `GET /admin/email/get`
- `POST /admin/email/create`
- `POST /admin/email/update`
- `POST /admin/email/delete`

Failure records:

- `GET /admin/email-failure/list`
- `GET /admin/email-failure/get`
- `POST /admin/email-failure/create`
- `POST /admin/email-failure/update`
- `POST /admin/email-failure/delete`

Template overrides:

- `GET /admin/email-template/list`
- `GET /admin/email-template/get`
- `POST /admin/email-template/create`
- `POST /admin/email-template/update`
- `POST /admin/email-template/delete`

Canonical event catalog:

- `GET /admin/email-event-type/list`

## Non-obvious backend rules

### Tenant and audit behavior

- Audit tenant resolution checks `x-athena-tenant`, then `x-tenant-id`, then `x-tenant`.
- Read `AdminPlugin::resolve_tenant_for_audit` in `crates/api/src/plugins/admin/mod.rs` before changing header handling.

### JSON bounds

`crates/api/src/plugins/admin/handlers.rs` currently defines:

- `MAX_ADMIN_JSON_BYTES = 32 * 1024`
- `MAX_ADMIN_JSON_DEPTH = 8`
- `MAX_TEMPLATE_VARIABLES = 64`
- `MAX_TEMPLATE_VARIABLE_LENGTH = 128`

Use `validate_json_value_bounds(...)` and `normalize_metadata_object(...)` as
the backend truth for metadata and JSON payload limits.

### Template variable normalization

`normalize_template_variables(...)` in `handlers.rs` enforces:

- array only
- string entries only
- no blank entries
- trim each entry
- max `64` entries
- max `128` characters per entry
- no duplicates after trimming
- final JSON bounds validation

If the SDK or consumer wants parity, align to these rules instead of inventing a
different validator.

### Event type behavior

- `eventType` is the canonical taxonomy seam.
- `normalize_optional_event_type(...)` validates format and character set.
- `ensure_email_event_type_exists(...)` checks the event type against the stored catalog.
- Runtime lookup resolves by `eventType` first, then falls back to built-in `templateKey`.
- `default_event_type_for_template_key(...)` is the fallback bridge when a create payload omits `eventType`.

### Update patch semantics

`types.rs` uses nullable patch deserializers for fields like:

- `eventType`
- `textTemplate`
- `htmlTemplate`

Interpretation:

- omitted field: keep existing value
- explicit `null`: clear the value
- string: replace the value

Do not collapse omitted and `null` into the same behavior.

## Built-in template catalog

Inspect `athena-auth/crates/core/src/email/templates.rs` for:

- seeded template keys
- required and optional variables
- built-in subject, html, and text fragments
- default variable injection
- render fallback behavior

Inspect `athena-auth/docs/auth/admin/email/event-type/README.md` for the seeded
canonical event types.

## Persistence seams

Inspect `athena-auth/crates/core/src/adapters/database.rs` for:

- `email_templates` selects, inserts, and updates
- stored `variables` JSON shape
- event-type storage and lookup
- duplicate key and locale behavior

Use this file when the problem is query shape, DB defaults, or stored column
selection, not when the bug is only request validation.

## Validation

Use WSL2 for Rust tests on this machine.

Targeted examples:

```powershell
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test -p athena-auth-api email_template"
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test -p athena-auth-api email_event_type"
wsl bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/athena-auth && cargo test -p athena-auth-api email_failure"
```

Prefer the targeted admin plugin tests in `crates/api/src/plugins/admin/tests.rs`
before broader workspace runs.
