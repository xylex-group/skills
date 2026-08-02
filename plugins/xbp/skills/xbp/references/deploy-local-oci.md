# XBP deploy — local OCI reference

Full engine: **`xbp-deploy.md`**. Native registry: **`xbp-registry.md`**.

## Image strategy matrix

| Goal | Flag / TUI choice | Docker | Kube imagePullPolicy (bootstrap) |
|------|-------------------|--------|----------------------------------|
| Local cluster, no push | `--local-image` / “local load” | `docker build -t …` only | `Never` |
| Remote registry | `--push-image` / “registry push” | build + push | `IfNotPresent` |
| Image already present | `--skip-build` / “skip build” | none | depends on prior deploy |

Default remote for init/release: **`registry.xbp.app`** (`XBP_OCI_TOKEN`).

## Auto-local contexts

- `docker-desktop`, `docker-for-desktop`, `rancher-desktop`
- `minikube`
- `kind-*`, `k3d-*`
- names containing `desktop`

Override with `--push-image`.

## .dockerignore (recursive)

```
**/.next
**/.open-next
**/node_modules
**/target
**/dist
**/out
**/.turbo
**/.cache
```

Windows “The file cannot be accessed by the system” under `.next/.../node_modules` is almost always context noise — exclude those trees.

## Dockerfile binary COPY

1. Bin may use `required-features` — enable them in `cargo build`
2. Stale cache — invalidate builder stage
3. Confirm package name vs bin name

## Bootstrap limitations

- Default listen port historically 8080; set `container_port` / expose
- Prefer real k8s manifests for production
- Compose injects env + ConfigMap on current xbp

## Verification

```bash
kubectl config current-context
docker images <image_ref>
kubectl -n <ns> get deploy,pods,svc
kubectl -n <ns> logs deploy/<name> --tail=80
```

Deploy history: `<project>/.xbp/deployments/*.json`.

## Cloudflare (not OCI)

Static docs: `xbp cloudflare init --kind assets` then `xbp deploy <svc> --to cloudflare --run --yes`.  
Worker+Container: `xbp cloudflare deploy --app …` (Cloudflare container registry, not registry.xbp.app).
