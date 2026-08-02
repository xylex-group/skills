# Athena Auth Cloudflare Layout

## Source of truth files

Read these files in order when using `athena-auth` as the template:

1. `wrangler.jsonc`
2. `worker/src/index.ts`
3. `worker/worker-configuration.d.ts`
4. `Dockerfile`
5. `.dev.vars.example`
6. `package.json`
7. `README.md` Cloudflare section

## What the repo is doing

### 1. Public entrypoint

`wrangler.jsonc` is the root deploy contract.

Current pattern in `athena-auth`:

- `main` points at `worker/src/index.ts`
- `compatibility_flags` includes `nodejs_compat`
- `observability` is enabled for traces and logs
- `routes` declares the custom domain
- `containers` defines the container class and image source
- `durable_objects.bindings` exposes that container class to the Worker
- `migrations` registers the Durable Object class

### 2. Worker role

`worker/src/index.ts` is a thin Cloudflare front door around the real server.

Important behaviors to preserve:

- import `Container` and `getContainer` from `@cloudflare/containers`
- define one canonical container port
- map Wrangler `vars` and secrets into container env vars
- reject requests early when required secrets are absent
- proxy requests to the running container
- handle the container attach/start race instead of assuming `start()` is always clean

### 3. App runtime

The real app is the Rust server built into the image by `Dockerfile`.

Important behaviors to preserve:

- multi-stage build
- build the actual server binary in the builder stage
- copy only runtime artifacts into the final image
- expose the same port the Worker expects
- keep the runtime image small and deterministic

### 4. Secret split

`wrangler.jsonc` contains non-secret defaults and routing config.

`.dev.vars.example` contains the local-development secret shape for:

- `DATABASE_URL`
- `DATABASE_KEY`
- `JWT_SECRET`
- SMTP credentials
- OAuth client secrets

The live deployment expects these through `wrangler secret put ...`.

### 5. Generated type surface

`worker/worker-configuration.d.ts` is generated, not hand-maintained.

The comment at the top of the file shows the exact repo command:

```bash
wrangler types worker/worker-configuration.d.ts --include-runtime false
```

The repo also includes that file in `tsconfig.json` so Worker env bindings stay typed.

### 6. Deploy commands

`package.json` keeps the Worker commands minimal:

```json
{
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev"
  }
}
```

The repo README states the supported Cloudflare path is:

1. Worker at the edge
2. Rust server in a Cloudflare Container
3. Direct PostgreSQL access from the container via `DATABASE_URL`

## Copy carefully

Do not cargo-cult the `athena-auth` literal values.

Adapt these per target project:

- Worker name
- custom domain route
- app port
- base URL and auth paths
- trusted origins
- OAuth providers
- container class name
- required secrets
- startup health endpoint

Keep the structure. Change the project-specific values.
