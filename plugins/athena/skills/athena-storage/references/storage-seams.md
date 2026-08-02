# Athena Storage Seams

## Route family map

Managed catalog routes:

- `src/api/storage/files.rs`
- `/storage/files*`
- `/storage/folders*`
- `/storage/permissions*`
- `/storage/multipart*`
- `/storage/audit/list`

Raw object and bucket routes:

- `src/api/storage/mod.rs`
- `/storage/objects*`
- `/storage/buckets*`

S3 catalog admin routes:

- `src/api/s3.rs`
- `/storage/catalogs*`
- `/storage/credentials`

## Durable owners

`crates/athena-s3/src/managed_files.rs` owns:

- managed file records in `athena.files`
- prefix listing and search
- permission grants and checks
- file status transitions
- presigned URL cache rows
- storage audit event listing and writes for managed file actions

`crates/athena-s3/src/store.rs` owns:

- `athena.s3`
- `athena.s3_credentials`
- encrypted storage credentials
- runtime loading of storage targets

`crates/athena-s3/src/file_catalog.rs` owns:

- the object-update audit bridge used by raw storage object flows
- `record_storage_file_update(...)`

`crates/athena-s3/src/schema.rs` owns:

- storage runtime schema self-heal
- runtime-only compatibility tables and columns for existing installs
- the readiness check that prevents handlers from assuming the schema is present

## Schema generation chain

Canonical DDL:

- `sql/files/athena-files.sql`

Generated outputs:

- `sql/provision_files.sql`
- generated storage block inside `sql/provision.sql`
- `docs/architecture/storage-files-schema.md`

Generator:

- `scripts/generate_storage_files_artifacts.py`

Important nuance:

- `crates/athena-s3/src/schema.rs` also owns runtime self-heal for compatibility tables and columns, including `athena.storage_audit_events`.
- Do not treat the generated provision files as hand-edited sources of truth.

## Useful grep anchors

- `configure_storage_routes`
- `storage_auth_middleware`
- `require_storage_actor`
- `resolve_optional_storage_actor`
- `upsert_managed_file_for_upload`
- `record_storage_file_update`
- `ensure_storage_runtime_schema`
- `load_s3_catalog_runtime`
- `storage_audit_events`
- `generate_storage_files_artifacts`

## Existing test anchors

Route and auth regression:

- `tests/auth_hardening.rs`

OpenAPI contract coverage:

- `tests/openapi.rs`

Crate-level unit coverage:

- `crates/athena-s3/src/managed_files.rs`
- `crates/athena-s3/src/file_catalog.rs`
- `crates/athena-s3/src/schema.rs`
- `crates/athena-s3/src/store.rs`
- `src/api/storage/validation.rs`
