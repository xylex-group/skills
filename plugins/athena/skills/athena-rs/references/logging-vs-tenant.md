# Logging vs tenant database ownership

## Logging client (`athena_logging` by default)

Gateway control plane and observability. Config:

- `gateway.logging_client` / `ATHENA_GATEWAY_LOGGING_CLIENT`
- `gateway.logging_pg_uri` / `POSTGRES_ATHENA_LOGGING_URI`

| Asset | Role |
|---|---|
| `athena_clients` | Tenant registry: URI, active/frozen, load-failure metadata |
| `athena_client_configs` | Per-client gateway config flags |
| `gateway_request_log` / `gateway_operation_log` | Request and operation telemetry |
| `client_statistics` / `client_table_statistics` | Aggregates from gateway logs |
| pressure / connection snapshot tables | Capacity and pool sampling |
| pipeline templates + step logs | Pipeline control plane |

## Tenant client (`X-Athena-Client`)

Provisioned application DB. Source: `sql/provision.sql`, provisioning expected tables.

| Asset | Role |
|---|---|
| Auth product tables | sessions, users, orgs, api keys (tenant-scoped) |
| Chat tables | rooms, messages, outbox, … |
| `athena.chat_session_auth_log` | Chat/WSS session auth audit (runtime heal on **this** pool) |
| Storage / billing tables (when provisioned) | Tenant product data |

## Decision tree

```
Is the data about one tenant's product behavior?
  yes → tenant pool (X-Athena-Client)
Is the data about how the gateway routes, catalogs, or observes many tenants?
  yes → logging pool
Is it in provision.sql EXPECTED_TABLES for a provisioned app DB?
  yes → tenant pool
Is it written by bootstrap ensure_* on logging_pool only?
  yes → logging pool (unless that ensure is a bug for a tenant table)
```

## Re-enable auto-disabled catalog client

1. Fix URI / network / credentials for the remote DB
2. On logging DB: `UPDATE athena_clients SET is_active = true, updated_at = now() WHERE lower(client_name) = lower('...');`
3. Or admin API if available
4. Next successful registry load clears consecutive failure counters in metadata
