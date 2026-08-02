# Mollie billing auth, tables, and sink enrichment

Use this when debugging Mollie webhook enrichment, `BILLING_ADAPTER_FAILED`, 401 / `40100`, or “Missing authentication, or failed to authenticate”.

## Auth channels (do not confuse)

| Channel | What authenticates | Headers / secret | Failure mode |
|--------|--------------------|------------------|--------------|
| **Inbound webhook signature** | Mollie → Athena sink | `X-Mollie-Signature` vs connection `signingSecrets` | `MOLLIE_WEBHOOK_REJECTED` / `WebhookRejected` |
| **Outbound Mollie REST API** | Athena → Mollie during enrichment | `Authorization: Bearer <token>` from connection credential | `BILLING_ADAPTER_FAILED` / HTTP 401 / code `40100` |

`balance-transaction.created` enrichment often:

1. Archives raw body to `athena.webhook_sink_events` (succeeds even if billing fails).
2. Loads `billing.billing_provider_connections` for the sink’s `connection_id`.
3. Verifies signature (if enabled).
4. Calls Mollie **`GET /v2/payments/{id}`** with the connection’s API credential to project a canonical payment.
5. That outbound call is where **401 / Missing authentication** means the **stored API key or access token** was rejected — **not** the webhook signature.

## Tables and roles

### `billing.billing_provider_connections` (precise)

**Physical location**

| Item | Value |
|------|--------|
| Schema.table | `billing.billing_provider_connections` |
| Postgres client | Athena PG client named by sink **`client_name`** (e.g. `suits-formations`) — **not** necessarily the gateway logging client |
| DDL | `sql/billing.sql` |
| Runtime load | `src/data/billing.rs` → `get_billing_provider_connection(pool, connection_id)` |
| Passed to Mollie | Entire row’s `config` **jsonb** deserialized as `MollieConnectionConfig` (`camelCase`) in `crates/athena-billing-mollie` |

**How the log line finds this row**

```
log.connection_id = 5b60e619-0da8-4e1f-8baf-5ba4fb335004
  = billing.billing_provider_connections.id
  (also wired from webhook-sink config / provisioning for sink "mollie" + client_name)
```

```sql
SELECT *
FROM billing.billing_provider_connections
WHERE id = '5b60e619-0da8-4e1f-8baf-5ba4fb335004'
  AND deleted_at IS NULL;
```

**Column-level map (first-class SQL columns)**

| Column | Type | Allowed / notes | Used for outbound Mollie API? | Used for inbound webhook signature? |
|--------|------|-----------------|--------------------------------|-------------------------------------|
| `id` | `uuid` PK | = log `connection_id` | yes (correlation) | yes (correlation) |
| `owner_kind` | text | `user` \| `org` \| `workspace` \| `tenant` | no | no |
| `owner_id` | text | owner scope id | no | no |
| `provider` | text | `mollie` \| `stripe` | yes (adapter pick) | yes |
| `mode` | text | `live` \| `test` (default `live`) | yes — testmode flag for org/OAuth tokens | no |
| `status` | text | `pending` \| `active` \| `disabled` \| `error` | operators should use `active` | same |
| `credential_kind` | text | see below | **yes** — selects Credential::api_key vs oauth_access_token | no |
| `provider_account_id` | text | Mollie org/account label | diagnostics | no |
| `provider_profile_id` | text nullable | Mollie `pfl_…` | **yes for org/OAuth** (also mirrored into `config.profileId`) | no |
| `scopes` | jsonb | array default `[]` | no | no |
| **`config`** | **jsonb** | **secrets + API base + signing** | **yes — holds Bearer secret** | **yes — holds signingSecrets** |
| `metadata` | jsonb | non-secret | no | no |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft-delete via `deleted_at` | load filters `deleted_at IS NULL` | same |

**`credential_kind` allowed values (CHECK constraint)**

- `api_key`
- `advanced_access_token` (alias of org-scoped token in Mollie dialect)
- `organization_access_token`
- `oauth_access_token`
- `secret_key` / `restricted_key` (Stripe-oriented; not Mollie Bearer kinds)

**`config` jsonb shape (Mollie — camelCase, serde on `MollieConnectionConfig`)**

Normalized by `normalize_connection_config` in `crates/athena-billing-mollie/src/lib.rs`.

| JSON key | Rust field | Required | Purpose |
|----------|------------|----------|---------|
| **`apiKey`** | `api_key` | **yes** | Single secret string used as **HTTP `Authorization: Bearer …`** for **all** Mollie credential kinds (API key *or* org/OAuth access token stored in this same field) |
| `apiBaseUrl` | `api_base_url` | default `https://api.mollie.com` | API host; client appends `/v2` if missing |
| `credentialKind` | `credential_kind` | should match SQL column | Must agree with row `credential_kind`; selects API-key vs OAuth credential builder |
| `mode` | `mode` | should match SQL column | `live` / `test` |
| `profileId` | `profile_id` | **required when** kind is org/OAuth/advanced | Mollie profile; SQL `provider_profile_id` is written into config on normalize |
| **`signingSecrets`** | `signing_secrets` | array (may be empty) | **Only** inbound next-gen / HMAC **webhook** verification (`X-Mollie-Signature`) — **not** used for GET /payments |
| `disableSigningSecretCheck` | `disable_signing_secret_check` | optional | Runtime may inject when sink disables signature checks |

### Defaults (SQL + create API)

| Field | SQL DEFAULT | Create API if body omits field |
|-------|-------------|-------------------------------|
| `mode` | **`live`** | **`live`** |
| `status` | **`pending`** | **`pending`** (set **`active`** for production use) |
| `credential_kind` | **`api_key`** | Mollie → **`api_key`**; Stripe → **`secret_key`** |
| `scopes` | `[]` | empty array |
| `config` | `{}` | object, then **normalized** (see below) |
| `provider_profile_id` | NULL | optional |
| `config.apiBaseUrl` (Mollie normalize) | — | **`https://api.mollie.com`** |
| `config.signingSecrets` (normalize) | — | **`[]`** if missing |
| `config.apiKey` | — | **no default** — required for API calls |

SQL source: `sql/billing.sql`. API defaults: `src/api/billing.rs` (`default_billing_credential_kind`, create handler).

### Credential kinds and token prefixes

| `credential_kind` | Typical `config.apiKey` prefix | Athena SDK path | `profileId` required? |
|-------------------|-------------------------------|-----------------|------------------------|
| `api_key` | `live_…` / `test_…` | `Credential::api_key` | no |
| **`advanced_access_token`** | often **`access_…`** | alias of **org** → `Credential::oauth_access_token` | **yes** |
| `organization_access_token` | `access_…` | `Credential::oauth_access_token` | **yes** |
| `oauth_access_token` | OAuth access token | `Credential::oauth_access_token` | **yes** |

In Rust, `advanced_access_token` is **only a serde alias** of `OrganizationAccessToken` (`crates/athena-billing-mollie/src/lib.rs`). Both send **`Authorization: Bearer`**.

Enrichment for payments needs scope **`payments.read`** (and matching profile).

### Example: healthy advanced-access-token row (redacted)

Real incident shape (suits-formations / Jortt-style Mollie org) — **never store live secrets in the skill**:

```text
id:                   <connection_uuid>          -- log connection_id
owner_kind / owner_id: org / <mollie_org_id>
provider:             mollie
mode:                 live
status:               active
credential_kind:      advanced_access_token
provider_account_id:  <mollie_org_id>
provider_profile_id:  pfl_…                      -- btrim! no leading space
scopes:               [..., "payments.read", "webhooks.read", "webhooks.write", ...]
config: {
  "apiBaseUrl": "https://api.mollie.com",
  "apiKey": "access_…",                          -- advanced token, NOT live_/test_
  "credentialKind": "advanced_access_token",
  "mode": "live",
  "profileId": "pfl_…",                          -- must match provider_profile_id after trim
  "signingSecrets": ["…"]                        -- inbound webhook only
}
```

**Hygiene bugs that caused false 401s in ops:**

1. **`provider_profile_id` with a leading space** (`" pfl_…"`) while `config.profileId` was clean — trim both: `btrim(provider_profile_id)`.
2. Confusing **signingSecrets** rotation with **API Bearer** failure.
3. Using `api_key` kind with an `access_…` token (or the reverse).

Runtime Mollie client reads **`config` jsonb** primarily; keep SQL columns aligned after every update.

**Critical precision for 401 / `BILLING_ADAPTER_FAILED`**

| What failed | Read from |
|-------------|-----------|
| Bearer token Mollie rejected | **`config.apiKey`** (same field name for api_key *and* access tokens) |
| How Athena builds the header | `credential_kind` / `config.credentialKind` → `Credential::api_key` vs `Credential::oauth_access_token` (both still send **Bearer**) |
| Profile for org/advanced tokens | `provider_profile_id` and/or `config.profileId` (trim whitespace) |
| Live vs test | column `mode` + `config.mode` |
| Webhook signature (separate) | **`config.signingSecrets` only** — does not fix API 401 |

There is **no** separate secrets table for billing: secret is **plaintext in** `config.apiKey` (DB ACL only, not pgcrypto).

**Operator inspect SQL**

```sql
-- On sink client_name Postgres (e.g. suits-formations):
SELECT
  id,
  provider,
  mode,
  status,
  credential_kind,
  provider_account_id,
  provider_profile_id,
  length(provider_profile_id) - length(btrim(provider_profile_id)) AS profile_whitespace,
  left(config->>'apiKey', 10) AS token_prefix,
  length(config->>'apiKey') AS api_key_len,
  config->>'profileId' AS config_profile,
  config->>'credentialKind' AS config_kind,
  config->>'mode' AS config_mode,
  jsonb_array_length(COALESCE(config->'signingSecrets', '[]'::jsonb)) AS signing_secret_count,
  scopes ? 'payments.read' AS has_payments_read
FROM billing.billing_provider_connections
WHERE id = $connection_id
  AND deleted_at IS NULL;
```

```sql
-- Fix leading/trailing space on profile column
UPDATE billing.billing_provider_connections
SET provider_profile_id = btrim(provider_profile_id), updated_at = now()
WHERE id = $connection_id
  AND provider_profile_id IS DISTINCT FROM btrim(provider_profile_id);
```

### Isolate Athena vs Mollie (mandatory when config looks correct)

```bash
curl.exe -sS -i \
  -H "Authorization: Bearer <config.apiKey>" \
  "https://api.mollie.com/v2/payments?limit=1"
```

| HTTP | Conclusion |
|------|------------|
| **200** | Token + `payments.read` OK outside Athena. If sink still 401s → Athena routing (wrong client pool, stale process, wrong `connection_id` on sink). |
| **401** | Mollie rejects token (revoked, wrong env, bad kind/profile binding). Fix token/profile in Mollie + `config.apiKey`. |
| **403** | Auth OK, scope/permission insufficient for that resource. |

**Verified once in ops (2026-07):** connection with `advanced_access_token` + `access_…` + `profileId` + `payments.read` returned **HTTP 200** from Mollie `GET /v2/payments?limit=1` after profile whitespace fix. Do not re-paste live secrets into skills or tickets.

To fix outbound 401 when curl also fails: update **`config.apiKey`** (+ kind/mode/profile) — **not** `signingSecrets`.

### `athena.webhook_sink_events`

**Where:** usually the logging / sink client (often same as gateway logging client).

**What:** immutable raw HTTP ingress for `/webhook-sinks/{name}` (path, headers, body, verification flags, sink name).

Self-heal plan: webhook sink schema heal in `src/api/webhook_sink_schema_heal.rs`.

### `billing.billing_projection_events`

**Where:** billing client DB.

**What:** projection ledger for sink → billing enrichment (verification status, projection status, link to `webhook_sink_event_id`, errors, snapshots).

Companion SQL: `sql/webhook_sink_projection_targets.sql`, `sql/migrations/add_billing_projection_events.sql`.

### `billing.billing_webhook_events`

Verified / successfully projected billing webhook envelopes (connection-scoped).

### Canonical document tables

Upserted after successful projection:

- `billing.billing_payments`
- `billing.billing_subscriptions`
- `billing.billing_invoices`
- `billing.billing_refunds`
- (plus products/prices/bindings as applicable)

### Not billing credentials: storage S3 tables

If the error mentions `secret_key` / storage upload:

| Table | Role |
|-------|------|
| `athena.s3_catalogs` | Catalog; API field **`s3_id` = this table’s `id`** |
| `athena.s3_credentials` | `catalog_id` → catalogs; `secret_key_encrypted` = **PGP armor**, decrypted with `ATHENA_STORAGE_SECRET_ENCRYPTION_KEY` |

Do not confuse storage `s3_id` with Mollie connection credentials.

## HTTP / code path

Generic Mollie sink:

```
POST /webhook-sinks/mollie  (or /webhooks/mollie)
  → src/api/webhook_sinks.rs
  → archive athena.webhook_sink_events
  → billing enrichment (connection_id from sink config)
  → src/data/billing.rs (ingest + project)
  → crates/athena-billing-mollie (verify + project_webhook / get_payment)
  → billing.billing_projection_events + canonical upsert
```

Key files:

- `src/api/webhook_sinks.rs` — sink + enrichment; soft-fail logs when raw archive already succeeded
- `src/data/billing.rs` — `map_billing_adapter_error`, connection load, ingest
- `crates/athena-billing-mollie/src/lib.rs` — `MollieConnectionConfig`, auth context helpers
- `crates/athena-billing-mollie/src/client_sdk.rs` — `get_payment`, `annotate_api_error`
- `crates/athena-billing-mollie/src/native.rs` — `map_mollie_error` + 401 clarification
- `config/webhook-sinks.yaml` — sink registry (provider, client, connection binding)

## Error codes to expect

| Code / reason | Meaning |
|---------------|---------|
| `BILLING_ADAPTER_FAILED` / `adapter_failed` | Provider adapter failed after raw archive (often Mollie API 401 on refetch) |
| `MOLLIE_WEBHOOK_REJECTED` | Inbound signature / verification rejected |
| `BILLING_CONNECTION_NOT_FOUND` | Missing `billing.billing_provider_connections` row |
| `BILLING_CONNECTION_CONFIG_INVALID` | Bad connection config (empty api key, missing profile_id for org token, …) |
| `BILLING_PROJECTION_IGNORED` | Event verified but intentionally not projected |

Logs should name:

- `auth_that_failed=outbound_provider_rest_api Authorization:Bearer` for API 401
- `connection_id`, `credential_kind`, `token_hint` (redacted), `operation` (e.g. `get_payment`)

## Operator playbook: Mollie sink enrichment 401

1. Note `connection_id` and `client_name` from the log (`athena::webhook_sinks`).
2. On that client’s DB, inspect `billing.billing_provider_connections` (SQL above).
3. Match kind to token prefix: `access_…` → `advanced_access_token` / `organization_access_token`; `live_`/`test_` → `api_key`.
4. Ensure **`config.apiKey`**, **`config.profileId`** (org/advanced), **`mode`**, **`status=active`**, **`payments.read`** in scopes.
5. **`btrim(provider_profile_id)`** so it equals `config.profileId`.
6. Prove Mollie with **curl** (table above) before blaming Athena.
7. If curl **200** but Athena still fails: check sink binds same `connection_id`, process has current config, enrichment uses the sink **`client_name`** pool.
8. Re-send webhook or wait for next `balance-transaction.created`.
9. Confirm `billing.billing_projection_events` → `projection_status` not failed with 401.

Raw sink rows remain in `athena.webhook_sink_events` even when enrichment fails.

## Worked incident notes (store; no secrets)

| Item | Value |
|------|--------|
| Client | `suits-formations` (example) |
| Sink | `POST /webhook-sinks/mollie` |
| Symptom | `BILLING_ADAPTER_FAILED`, Mollie 401 / 40100, `Missing authentication…` while raw archive OK |
| Event | `balance-transaction.created` → outbound `get_payment` |
| Root cause class | Config/kind/profile hygiene and/or operator confusion of auth channels — not “Athena invents wrong default kind” once row is correct |
| Fixes applied | Correct `advanced_access_token` + `access_…` + profile; trim profile whitespace; prove token via curl **200** |
| Post-fix | Replay webhook; watch projection ledger + logs for that `connection_id` |

## Related recent work (keep skill in sync)

- Clearer Mollie 401 messages: REST Bearer vs webhook signature.
- Connection-scoped adapter error formatting in `src/data/billing.rs`.
- `get_payment` annotates operation + auth context.
- Defaults + advanced_access_token / `access_…` / profile requirements documented here.
- Storage path: `s3_id` = `athena.s3_catalogs.id`; decrypt via `ATHENA_STORAGE_SECRET_ENCRYPTION_KEY`.
- Tracing: HTTP span `athena_client`; Loki vendored level fix for event severity.
- Chat session auth log schema heal for `athena.chat_session_auth_log` on the logging client.
