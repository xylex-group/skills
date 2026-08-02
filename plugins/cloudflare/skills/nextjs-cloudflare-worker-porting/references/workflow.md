# Workflow

## 1. Inspect the existing project

Start with the current repo contract rather than a blank-template migration.

Operational baseline:

1. change to the project root
2. pull the latest repo state before porting
3. confirm the package manager and lockfile before adding dependencies

Check:

- `package.json` scripts and dependencies
- lockfile and package manager
- `next.config.*`
- `app/`, `pages/`, `src/`, and `middleware.*`
- existing `wrangler.jsonc` or `wrangler.toml`
- host-specific files for Vercel, Netlify, custom Node servers, Docker, or reverse proxies

Search for likely runtime problems:

- `process.cwd`, `fs`, `child_process`, `net`, `tls`
- native binaries and image/video tooling
- long-lived background jobs started inside the web app
- direct assumptions about writable local disk
- custom Express/Fastify/Node HTTP server bootstraps

## 2. Decide between automatic and manual Cloudflare configuration

Use automatic configuration when:

- the project has no checked-in Wrangler config
- there are no complex bindings or environments yet
- the user mainly wants a fast baseline port

Use manual configuration when:

- bindings, vars, queues, KV, R2, D1, or Durable Objects already matter
- CI needs explicit checked-in deployment config
- the repo already has Cloudflare files that must remain source-of-truth
- multiple deploy environments exist

## 3. Apply the baseline Worker migration

Expected baseline:

- run `git pull` before dependency or config changes when the repo is not already confirmed current
- install `@opennextjs/cloudflare`
- if `pnpm` requires build approval, run `pnpm approve-builds` and approve the requested builds
- install `wrangler` as a dev dependency
- add `open-next.config.ts`
- add or repair Wrangler config
- add package scripts for preview and deploy

Typical manual configuration targets:

- Worker entrypoint: `.open-next/worker.js`
- static assets directory: `.open-next/assets`
- assets binding: `ASSETS`
- Wrangler `name`: derive from the actual app or package name in `package.json`
- compatibility flag: `nodejs_compat`
- compatibility date: current date, but never earlier than `2024-09-23`

Typical scripts:

```json
{
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

## 4. Port code that is sensitive to the runtime change

Review these seams carefully:

- `middleware.*`
- route handlers under `app/api` or `pages/api`
- server actions
- auth callbacks and session storage
- image handling
- cache and revalidation logic
- env access in server-rendered components

Prefer targeted code changes:

- replace host-specific helpers instead of layering more adapters on top
- move runtime-only env reads onto dynamic server paths when needed
- remove custom server boot code when Next plus OpenNext already handles the route surface

## 5. Align env and bindings

When new variables or bindings are needed:

- update `.env`
- update `.env.local`
- update `.env.example`
- add comments and dummy values

If Worker bindings changed, regenerate typed env output when the repo uses it.

For local development, prefer Next.js `.env` files so the same values are available to both `next dev` and local Worker preview.

If the repo uses `.dev.vars`, use it for Worker-local settings such as:

```dotenv
NEXTJS_ENV=development
```

`NEXTJS_ENV=development` selects `.env.development` when running locally on a Worker. If `NEXTJS_ENV` is unset, production is the default.

For CI or Workers Builds, ensure both public and non-public build-time variables are available where Next build needs them.

For production runtime variables, prefer the Cloudflare dashboard instead of checked-in local files. If deploys should preserve dashboard-managed vars, use the deploy form that passes `--keep-vars`.

## 6. Validate in the right order

Use the smallest trustworthy sequence:

1. install dependencies
2. run type generation if needed
3. run the repo's narrow typecheck or test gate for changed seams
4. run `preview`
5. run deploy dry-run or the repo's real deploy gate when appropriate

Do not stop after `next dev` works. `dev` runs in Node.js and can hide Worker-runtime failures.

## 7. Report blockers precisely

If the app is not realistically portable without deeper redesign, report:

- the exact dependency or API that blocks Workers compatibility
- the file path or package causing it
- whether the blocker is middleware-only, server-only, build-only, or deploy-only
- the smallest viable next step
