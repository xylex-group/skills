# Athena Billing Route Spine

Read these files first when the task is about public routes, route parity, or the JS billing client:

- `crates/athena-billing/src/live_http_routes.rs`: Rust source of truth for the live billing HTTP inventory.
- `contracts/billing/live-http-routes.json`: checked-in exported inventory.
- `packages/athena-js/src/billing/live-http-routes.json`: JS mirror consumed by the billing subpath.
- `packages/athena-js/src/billing/module.ts`: `billingSdkManifest`, typed method surface, query/body conventions, and `/debug/billing` support.
- `packages/athena-js/test/billing-contract-spine.test.ts`: exact METHOD+path parity gate.
- `packages/athena-js/test/billing-client.test.ts`: method mapping, body/query/header behavior, and `jwt_secret` query checks.
- `docs/billing_canonical_route_manifest.md`: route-by-route status, canonical DTO intent, and route ownership.

Current live surfaces include:

- `/billing/v1/*`
- `/admin/billing/*`
- `/admin/webhook-sinks/helpers/billing`
- `/billing/providers/{provider}/clients/{client_name}/connections/{connection_id}/webhook`
- `/debug/billing`

When the JS manifest and the Rust inventory disagree, fix the drift explicitly and rerun the billing contract-spine tests.
