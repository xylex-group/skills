# Runtime Notes

## Supported and risky areas

Cloudflare's current Next.js guidance supports App Router, Pages Router, route handlers, React Server Components, SSG, SSR, ISR, server actions, streaming, middleware, PPR, and composable caching through the OpenNext adapter.

Treat these as the first caveats to verify during a port:

- Node.js middleware introduced in Next.js 15.2 is not yet supported on Cloudflare Workers.
- `next dev` uses the Node.js dev server, while `preview` runs against the Worker runtime and is the higher-signal migration gate.
- Image optimization is supported through Cloudflare Images, so inspect any existing custom loader or host-specific image setup before assuming it still fits.

## Environment variables

There are two distinct concerns:

1. Next.js build-time inlining or prerender decisions
2. Worker runtime env access

For App Router code that must read env at runtime, prefer dynamic server execution patterns so the value is not frozen at build time. Current Next.js guidance uses `connection()` from `next/server` before reading runtime env values.

Cloudflare currently populates `process.env` automatically when `nodejs_compat` is enabled and the compatibility date is after `2025-04-01`. Even with that behavior, do not skip CI or Workers Builds configuration for build-time variables; Next build still needs required secrets and public vars at build time.

Use this default env split unless the repo already has a deliberate alternative:

- local development: Next.js `.env` files
- local Worker environment selection: `.dev.vars` with `NEXTJS_ENV=development` when needed
- production runtime variables: Cloudflare dashboard
- Workers Builds build-time variables: Cloudflare "Build variables and secrets"

`.env` and `.dev.vars` are local files and should not be committed as production secret sources.

## Required config defaults

Manual Wrangler config should normally include:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

Also set a current `compatibility_date`. For `@opennextjs/cloudflare`, the date must be `2024-09-23` or later.

`open-next.config.ts` baseline:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

## Validation priorities

When the port touches any of these, validate them explicitly:

- middleware route matching
- auth redirects and callback handlers
- server actions with runtime env access
- ISR or revalidation behavior
- image responses
- streaming routes
- cache-dependent pages

If the repo has both `dev` and `preview`, trust `preview` for migration signoff.

## Good default commands

Use the repo's package manager, but the expected Cloudflare-specific commands are usually:

```bash
pnpm run preview
pnpm run deploy
pnpm run cf-typegen
```

If the repo lacks scripts and the migration is still in progress, the equivalent commands are usually:

```bash
npx wrangler deploy
opennextjs-cloudflare build
opennextjs-cloudflare preview
```

When production runtime vars are managed in the Cloudflare dashboard and the deploy flow should preserve them, use:

```bash
opennextjs-cloudflare deploy -- --keep-vars
```
