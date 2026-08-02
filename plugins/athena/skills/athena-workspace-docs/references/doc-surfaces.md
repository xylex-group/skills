# Athena doc surfaces

This skill is for the Athena repository at `C:\\Users\\floris\\Documents\\GitHub\\athena`.

## Generator-owned surfaces

Update `scripts/generate_workspace_docs.py` first when any of these need to change:

- `README.md`
- `docs/README.md`
- `docs/index.md`
- `docs/workspace-scale.md`
- `docs/workspace-manifest.md`
- `crates/README.md`
- `crates/MANIFEST.md`
- `crates/*/README.md`
- `apps/README.md`
- `apps/MANIFEST.md`
- `apps/cdc-api/README.md`
- `apps/docs/README.md`
- `apps/marketing/README.md`
- `apps/web/README.md`
- `benches/README.md`
- `benches/MANIFEST.md`
- `examples/README.md`
- `examples/MANIFEST.md`

## Manual or domain-specific surfaces

Do not overwrite these with generic generator output unless the user explicitly wants that change:

- `apps/cloudflare-athena/README.md`
- `apps/cloudflare-d1-proxy/README.md`
- `apps/desktop/README.md`
- `apps/wss-gateway/README.md`
- Deep architecture and runtime docs under `docs/architecture*`
- Product docs content under `apps/docs/content/docs/`

## Validation

- Generate: `python scripts/generate_workspace_docs.py`
- Drift check: `python scripts/generate_workspace_docs.py --check`
- Rust validation: use WSL2 for `cargo` commands on this machine
