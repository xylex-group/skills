# xbp-registry — native OCI registry

Public Distribution endpoint: **`https://registry.xbp.app/v2/`**

XBP’s default OCI backend for consumer monorepos (replaces “must use ghcr” for release image push when wired by `xbp init`).

## Architecture

```text
docker / xbp oci / xbp v release --oci
        │
        ▼
registry.xbp.app  (Cloudflare Worker custom domain)
  apps/registry  → Worker edge + Container (Rust Distribution)
        │
        │  XBP_REGISTRY_STORAGE_URL
        ▼
xbp-registry-storage Worker
  apps/registry-storage
  R2: xbp-registry          (blob / manifest bytes)
  D1: xbp-registry-db       (tags, digests, upload sessions)
```

| Piece | Path | Notes |
|-------|------|--------|
| Edge deployable | `apps/registry` | `wrangler.jsonc` + container class, domain `registry.xbp.app` |
| Protocol crate | `crates/xbp-oci-registry` | Distribution + domain ports; xbp-proxy storage adapters |
| Client crate | `crates/oci` | parse ref, inspect, tags, promote |
| Storage Worker | `apps/registry-storage` | Standalone so storage can ship without full `apps/web` promote |
| Migrations | `apps/web/drizzle-registry/` | D1 schema for registry metadata |

**Why storage is separate:** promoting full `apps/web` (TanStack Start) has broken Start/login; durable registry lives on `xbp-registry-storage` workers.dev first.

Default storage base (CLI doctor):

```text
https://xbp-registry-storage.xylex-group.workers.dev/api/registry/storage
```

Edge env: `XBP_REGISTRY_STORAGE_URL` points the container/proxy at that base.

## CLI

```bash
# Health: Distribution /v2/ + storage /health
xbp oci doctor
xbp oci doctor --registry https://registry.xbp.app \
  --storage https://xbp-registry-storage.xylex-group.workers.dev/api/registry/storage

xbp oci inspect registry.xbp.app/xylex-group/docs:1.2.3
xbp oci digest registry.xbp.app/xylex-group/docs:1.2.3
xbp oci tags registry.xbp.app/xylex-group/docs
xbp oci promote registry.xbp.app/xylex-group/docs:1.2.3 --to stable
```

### Auth for push

```bash
# Preferred for xbp release OCI step
export XBP_OCI_TOKEN=…
export XBP_OCI_USERNAME=…   # optional; often GitHub owner / org

docker login registry.xbp.app -u "$XBP_OCI_USERNAME" --password-stdin <<< "$XBP_OCI_TOKEN"
```

Also accepts GH-style tokens for ghcr; for **registry.xbp.app** use `XBP_OCI_*`.

## Init wiring

`xbp init` → **OCI registry** module defaults:

- `oci.default_registry = "registry.xbp.app"`
- per-service `services[].oci.image` when Dockerfiles discovered
- `[versioning.release.oci]` enabled with `strategy = "local-build-push"`

```toml
[versioning.release.oci]
enabled = true
strategy = "local-build-push"   # local docker build + push
tag_templates = ["{version}", "{version}-{flag}"]
# services = []  # empty = all services with oci.dockerfile
```

Tags: `registry.xbp.app/{owner}/{service}:1.2.3` and `:1.2.3-beta`.

```bash
xbp v release --oci              # force image step
xbp v release --no-oci           # skip
xbp v release --oci-local-only   # docker load only
xbp v release --oci-dry-run
```

Code: `init_wizard.rs` (`setup_oci`), `version/oci_release.rs`,  
`deployment_config::{VersionReleaseOciConfig, XBP_OCI_DEFAULT_REGISTRY, compose_versioned_oci_image_ref}`.

## Deploy the registry itself

```bash
# From xbp monorepo root (Docker for container image)
export CLOUDFLARE_API_TOKEN=cfut_…
xbp cloudflare doctor --app registry
xbp cloudflare deploy --app registry --rollout immediate
# or:
xbp deploy registry --to cloudflare --run --yes
```

Storage Worker:

```bash
cd apps/registry-storage
npx wrangler secret put XBP_API_SHARED_TOKEN
npx wrangler deploy
```

Local stack (registry + MCP + API):

```powershell
pwsh ./stack-up.ps1
# Registry: http://127.0.0.1:5000/v2/
```

```bash
cargo run -p registry   # memory backend dev
cargo test -p xbp-oci --locked
cargo test -p xbp-oci-registry --locked
```

## Storage API (summary)

Auth: CLI bearer (`xbp login`) **or** `XBP_API_SHARED_TOKEN`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` or `/api/registry/storage/health` | Bindings ready |
| * | `/api/registry/storage/blobs/{digest}` | Blob R/W |
| * | `/api/registry/storage/manifests/{repo}/{ref}` | Manifest by tag/digest |
| GET | `/api/registry/storage/repositories/{repo}/tags` | List tags |
| POST | `/api/registry/storage/uploads` | Chunked upload session |

See `apps/web/docs/cli-api.md` and `apps/registry-storage/README.md`.

## Relation to `xbp deploy`

- **K8s deploy** may pull `registry.xbp.app/...` if `services[].oci.image` points there and you use `--push-image` / release OCI.
- **Local k8s** still prefers `--local-image` (no pull).
- **Cloudflare assets workers** do **not** use the OCI registry; they use wrangler assets/OpenNext.
- **Cloudflare containers** use Cloudflare’s container registry; OCI registry is for k8s/generic docker tags.

## Gotchas

1. Storage Worker must be healthy before long pushes (`xbp oci doctor`).
2. Do not force full `apps/web` promote only to ship registry storage — use `apps/registry-storage`.
3. Custom domain `registry.xbp.app` must stay on the same CF account as the Worker.
4. Incomplete `Cargo.lock` can block local registry binary builds — regenerate if needed.
5. Never commit `XBP_OCI_TOKEN` / `XBP_API_SHARED_TOKEN`.
6. **Blob uploads ≥~3–4 MiB must not go through the Container/DO body buffer** — edge Worker proxies `/v2/*/blobs/*` to storage (streamed). Without that path, docker push fails with `413 Payload Too Large` / `length limit exceeded`.
7. Edge blob path requires Worker secret `XBP_API_SHARED_TOKEN` (same as storage).
