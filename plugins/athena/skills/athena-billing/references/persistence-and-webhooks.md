# Billing Persistence and Webhooks

## Canonical tables

| Table | Database | Purpose |
|-------|----------|---------|
| `billing.billing_provider_connections` | Billing client (`client_name`) | Row `id` = sink `connection_id`. **Bearer secret = `config.apiKey` jsonb.** Kind/mode/profile = SQL columns (+ mirrored in config). **Webhook HMAC = `config.signingSecrets` only.** See [mollie-auth-and-tables.md](mollie-auth-and-tables.md) |
| `billing.billing_webhook_events` | Billing client | Verified projected billing webhook envelopes |
| `billing.billing_payments` | Billing client | Canonical payments |
| `billing.billing_subscriptions` | Billing client | Canonical subscriptions |
| `billing.billing_invoices` | Billing client | Canonical invoices |
| `billing.billing_refunds` | Billing client | Canonical refunds |
| `billing.billing_projection_events` | Billing client | Projection ledger linked to raw sink ingress |
| `athena.webhook_sink_events` | Logging / sink client | Immutable raw HTTP evidence for generic sinks |

SQL sources: `sql/billing.sql`, `sql/webhook_sink_projection_targets.sql`, migrations under `sql/migrations/`.

For Mollie 401 / adapter failures and exact column meaning, see [mollie-auth-and-tables.md](mollie-auth-and-tables.md).

## Ingestion paths

### Connection webhook path

- `POST /billing/providers/{provider}/clients/{client_name}/connections/{connection_id}/webhook`
- Provider-aware verification and canonical projection directly against the connection.

### Generic sink path (Mollie production path)

- `POST /webhook-sinks/{sink_name}` (e.g. `/webhook-sinks/mollie`)
- Public alias: `POST /webhooks/{sink_name}`
- Checked-in Mollie shortcut in `config/webhook-sinks.yaml`

Flow:

1. Persist raw ingress → **`athena.webhook_sink_events`** (must succeed independently).
2. Load sink runtime + **`billing.billing_provider_connections`** by configured `connection_id`.
3. Billing enrichment: verify signature if enabled, project event (may **outbound** call Mollie API with connection Bearer token).
4. Upsert **`billing.billing_projection_events`**.
5. Upsert canonical billing documents when projection yields a document.
6. Shared post-upsert fanout + optional Auth rights sync.

If enrichment fails after step 1, logs say raw archival succeeded (`adapter_failed` / `BILLING_ADAPTER_FAILED`). That is expected soft-fail for operator visibility.

## Two auth channels on Mollie sinks

1. **Inbound** `X-Mollie-Signature` ↔ connection signing secrets → webhook accept/reject.
2. **Outbound** `Authorization: Bearer` ↔ connection `apiKey` / access token → refetch (e.g. `get_payment` for `balance-transaction.created`).

HTTP 401 / Mollie code `40100` on enrichment = channel **2**, not channel **1**.

## Operator helper routes

- `GET /admin/billing/providers`
- `GET /admin/billing/grants`
- `GET /admin/webhook-sinks/helpers/billing`
- `POST /admin/billing/clients/{client_name}/webhook-sinks/provision`

Keep helper payloads, checked-in SQL, and docs synchronized.
