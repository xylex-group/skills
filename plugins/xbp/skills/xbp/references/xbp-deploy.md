# xbp-deploy — deploy engine reference

**Crate:** `crates/deploy` (`xbp-deploy`) in the xbp monorepo  
**CLI:** `xbp deploy` → maps `.xbp/xbp.toml` into the engine and runs plan/run/verify

## Flow

```text
services[] + deploy.envs + destinations
        ↓ planner
DeployPlan
        ↓ runner
optional OCI build/load/push → k8s apply or CF wrangler → health
        ↓
.xbp/deployments/<id>.json
```

## Providers

| Provider | Use for | Notes |
|----------|---------|--------|
| `kubernetes` | Cluster deploy | compose env, bootstrap or manifests, expose |
| `cloudflare-worker` | Static assets / OpenNext | **No** OCI image, **no** containers rollout in plan |
| `cloudflare-containers` | Worker + Container | containers rollout immediate by default |

`--to cloudflare|kubernetes|all` selects destinations when `deploy.destinations` is multi-target.

## Image flags

| Flag | Behavior |
|------|----------|
| `--local-image` | docker build only; `imagePullPolicy: Never` |
| (auto) | local kube contexts default to local-image |
| `--push-image` | build + push (ghcr / **registry.xbp.app** / …) |
| `--skip-build` | use existing image ref |

## Commands

```bash
xbp deploy <svc> --plan
xbp deploy <svc> --run --yes --env production
xbp deploy <svc> --local-image --run --yes
xbp deploy <svc> --to cloudflare --run --yes
xbp deploy --history
xbp deploy --engine-check
xbp deploy --redact-history
xbp deploy --revitalize <id>
```

History lives under the **project** `.xbp/deployments/`. Secrets in history are redacted; plaintexts soft-upload to xbp.app when `xbp login`.

## Compose (k8s)

dotenv + service env + deploy.envs env → container env; config files → ConfigMap; `required_env` hard-fails only on k8s paths.

## Assets worker first deploy

```bash
xbp cloudflare init --kind assets --worker-root apps/docs --domain host --service docs --write
xbp deploy docs --to cloudflare --run --yes
```

## Related monorepo paths (when editing xbp)

- `crates/deploy/src/planner.rs` — destinations, assets plan hygiene  
- `crates/deploy/src/runner.rs` — apply phases  
- `crates/cli/src/commands/deploy_engine/` — CLI adapter, doctor, interactive OCI choices  

Also see `deploy-local-oci.md` and `xbp-registry.md`.
