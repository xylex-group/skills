# Athena Billing Implementation Map

## Core crates

- `crates/athena-billing-core`: canonical billing domain types, commands, optional capability ports, requirement expressions, and provider-neutral errors.
- `crates/athena-billing`: application orchestration, rights/grants registry, canonical persistence shapes, route inventory export, and webhook-sink mirror helpers.
- `crates/athena-billing-mollie`: Mollie request construction, webhook verification, refetch, canonical projection, and dialect rights.
- `crates/athena-billing-stripe`: Stripe request/native models, signature verification, canonical projection, and dialect rights.

## Root runtime and HTTP seams

- `src/data/billing.rs`: connection loading, provider webhook ingestion orchestration, canonical upserts, and runtime entrypoints.
- `src/data/billing_fanout.rs`: shared post-upsert Athena Auth and gateway sink fanout.
- `src/data/billing_auth_sync.rs`: billing-to-auth sync payload dispatch.
- `src/api/billing.rs`, `src/api/billing_v1/**`, `src/api/debug/billing.rs`: live HTTP handlers.
- `src/api/webhook_sinks.rs`: generic sink ingestion and billing enrichment persistence.

## JS and example-app surfaces

- `packages/athena-js/src/billing/{index,module}.ts`: published JS billing client and route manifest.
- `packages/athena-js/src/{index,browser,v3-client}.ts`: public exports and `client.billing`.
- `packages/athena-auth-ui/examples/next-heroui-example/src/app/(site)/billing/page.tsx` and neighboring billing showcase files: example-app billing operator surface.

## SQL and config

- `sql/billing.sql`: canonical billing schema.
- `sql/webhook_sink_projection_targets.sql`: projection ledger target.
- `sql/billing_webhook_sinks_seed.sql`: sink seed mirror artifacts.
- `config/webhook-sinks.yaml`: checked-in boot-time sink registry.

## Docs

- `docs/billing_canonical_route_manifest.md`: route contract.
- `docs/architecture_billing_adapter_and_webhook_ingestion.md`: end-to-end ingestion and projection architecture.
- `docs/billing_webhook_sinks.md`: sink registry, aliases, and projection behavior.

## Mollie adapter auth diagnostics (recent)

- `crates/athena-billing-mollie/src/lib.rs`: `MollieConnectionConfig::auth_failure_context`, `redact_mollie_secret`, credential kind labels; `advanced_access_token` serde alias of org-scoped kind.
- `crates/athena-billing-mollie/src/native.rs`: `map_mollie_error` clarifies 401 / code `40100` as **outbound REST Bearer**, not webhook signature.
- `crates/athena-billing-mollie/src/client_sdk.rs`: `get_payment` + `annotate_api_error(operation, resource_ref)`.
- `src/data/billing.rs`: `map_billing_adapter_error(&connection, …)` adds `connection_id`, `credential_kind`, redacted `token_hint`.
- `src/api/billing.rs`: create defaults `mode=live`, `status=pending`, Mollie `credential_kind=api_key`.
- Skill detail + defaults + curl isolate + worked incident: [mollie-auth-and-tables.md](mollie-auth-and-tables.md).
