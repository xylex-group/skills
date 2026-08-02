# Key file seams (`athena_rs` server)

| Task | Start here |
|---|---|
| AppState fields / defaults | `src/lib.rs` |
| Config + env resolution | `src/config.rs`, `config.yaml` |
| Bootstrap / registry build | `src/bootstrap/mod.rs` |
| Catalog merge + load plan | `src/bootstrap/postgres_init.rs` |
| Catalog row CRUD + penalties | `src/data/clients.rs` |
| Catalog → registry on demand | `src/athena/postgres_clients.rs` |
| Reconnect worker | `src/daemon/mod.rs` |
| Chat session auth | `src/api/chat/auth.rs` |
| Chat auth audit log + heal | `src/api/chat/auth_logging.rs` |
| Gateway request logging | `src/utils/request_logging.rs` |
| Pool registry | `src/drivers/postgresql/sqlx_driver` (and registry types) |
| Tenant provision SQL | `sql/provision.sql`, `crates/athena-provisioning` |
| Logging catalog SQL | `sql/athena_clients.sql` |

## Policy defaults (load-failure auto-disable)

- auto_disable: true
- threshold: 10 consecutive failures
- window: 24 hours
- storage: `athena_clients.metadata.registry_load_penalty` on **logging** DB
