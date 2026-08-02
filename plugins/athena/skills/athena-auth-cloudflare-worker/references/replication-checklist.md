# Replication Checklist

Use this checklist to move a project from no Wrangler setup to the same deployment shape as `athena-auth`.

## 1. Confirm the target runtime

- Identify the real server process that should run inside the container.
- Identify the internal port that process will listen on.
- Confirm the project can build into one deterministic container image.

## 2. Add Worker dependencies

Add the minimum Worker toolchain to the repo's existing package manager:

- `wrangler`
- `typescript` if the Worker is TypeScript
- `@cloudflare/workers-types`
- `@cloudflare/containers`

Then verify:

```bash
wrangler --version
wrangler whoami
```

## 3. Add or adapt the Dockerfile

The image must:

- build the actual app server
- expose the server port the Worker will proxy to
- start exactly one server process by default

If the app is not yet container-friendly, fix that first. Do not build the Worker layer on top of a broken image.

## 4. Add `wrangler.jsonc`

Start with these concepts, adapted to the target repo:

- `$schema`
- `name`
- `main`
- `compatibility_date`
- `compatibility_flags`
- `observability`
- `routes` or other deployment routing config
- `vars`
- `containers`
- `durable_objects.bindings`
- `migrations`

Keep secrets out of this file.

## 5. Add `worker/src/index.ts`

The Worker should do four jobs only:

1. map env vars and secrets into the container
2. ensure required secrets exist before proxying
3. start or attach to the container
4. proxy the incoming request

Keep the Worker thin. Business logic belongs in the real app server, not the edge bridge.

## 6. Add local secret scaffolding

Create `.dev.vars.example` documenting the required secret keys.

If the repo already uses `.env.example`, document the Cloudflare-specific split clearly:

- `.env*` for app-local workflows if needed
- `.dev.vars` for local Wrangler secrets
- `wrangler secret put` for deployed secrets

## 7. Generate Worker env types

Run:

```bash
wrangler types worker/worker-configuration.d.ts --include-runtime false
```

Then make sure the generated file is included in the Worker TypeScript config.

Never hand-maintain the binding interface when Wrangler can generate it.

## 8. Add scripts and task wiring

At minimum, expose:

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  }
}
```

Add repo-specific helper commands only if they remove repeated manual work.

## 9. Validate before deploy

Run the narrow Worker checks first:

```bash
wrangler check
wrangler deploy --dry-run
```

If the image or app boot path changed, also run the target app's own build or test gate before deploy.

## 10. Common failure modes

### Missing required secret

Symptom:
the Worker returns a startup/config error before reaching the app.

Fix:
add the missing value to `.dev.vars` for local dev and `wrangler secret put` for deployed environments.

### Port mismatch

Symptom:
the container starts but the Worker cannot proxy successfully.

Fix:
align the app server listen port, Docker `EXPOSE`, Worker constant, and fallback env var.

### Stale generated bindings

Symptom:
TypeScript errors or missing `env.*` fields after changing `wrangler.jsonc`.

Fix:
rerun `wrangler types ...` immediately.

### Overstuffed Worker

Symptom:
the Worker starts collecting app logic, auth logic, or DB calls.

Fix:
move that logic back into the real app server and keep the Worker as a thin ingress/proxy layer.
