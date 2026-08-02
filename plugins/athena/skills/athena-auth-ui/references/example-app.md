# next-heroui-example

Path: `packages/athena-auth-ui/examples/next-heroui-example`

Reference consumer for `@xylex-group/athena-auth-ui` (workspace `*`) on **Next 16**
+ HeroUI v3 + OpenNext Cloudflare. This is the **only** example in skill scope;
ignore `examples/native-heroui-example` and `packages/heroui-native`.

## Why it exists

- Proves real AuthProvider / proxy / cookie / session-bridge wiring
- Showcases tables, storage, billing, chat, emails, settings, sidebar builder
- Validates local SDK overlay from monorepo `packages/athena-js` when present
- Cloudflare Workers deploy path (OpenNext + Wrangler)

## Commands

From monorepo root (`packages/athena-auth-ui`):

```bash
bun run athena-js:build
bunx nx run next-heroui-example:dev
bunx nx run next-heroui-example:build
bunx nx run next-heroui-example:preview
bunx nx run next-heroui-example:deploy
```

From the example directory:

```bash
pnpm run dev          # next dev --turbo
pnpm run build        # local athena overlay + OpenNext build
pnpm run deploy
pnpm run athena:generate
pnpm run athena:generate:dry
```

Typecheck when Nx has no dedicated target:

```bash
cd examples/next-heroui-example
bunx tsc --noEmit --project tsconfig.json
```

## Key source map

### App shell

| Path | Role |
| --- | --- |
| `src/app/layout.tsx` | Root layout |
| `src/components/providers.tsx` | Theme + TanStack + AuthProvider + routing-debug state |
| `src/components/root-client-shell.tsx` | Client shell |
| `src/components/header.tsx` / `dashboard-sidebar.tsx` | Chrome |
| `src/styles/app.css` | Tailwind + HeroUI + package styles chain |

### Athena / auth construction

| Path | Role |
| --- | --- |
| `src/lib/athena.ts` | Browser Athena env config + browser client helper |
| `src/lib/athena-server.ts` | Request-scoped server Athena client |
| `src/lib/auth.ts` | `createAthenaAuthClient` wrappers for requests |
| `src/lib/auth-routing.ts` | Proxy vs upstream URL resolution |
| `src/lib/auth-session-bridge.ts` | Session bridge helpers |
| `src/components/providers/auth-client-bridge.ts` | Auth client + routing state factory |
| `src/components/providers/auth-routing-persistence.ts` | localStorage routing-debug persistence |
| `src/components/auth-session-token-bridge.tsx` | Client session token bridge UI |
| `athena.config.ts` + `athena/**` | Generator config + seed registry/models |

### Routes (site)

| Route | Showcase |
| --- | --- |
| `/` | Home |
| `/auth/[[...path]]` | Auth pages |
| `/settings`, `/settings/[path]` | Settings |
| `/tables` | Tables |
| `/storage`, `/files` | Storage / files |
| `/billing` | Billing |
| `/chat` | Chat |
| `/emails` | Email templates |
| `/data-hooks` | Data hooks / read-query |
| `/utils` | Utils showcase |
| `/icons` | Icons |
| `/sidebar-demo` | Sidebar builder demo |
| `/reset-password` | Reset password |

### API routes

| Route | Role |
| --- | --- |
| `/api/auth/[...all]` | Auth proxy catch-all |
| `/api/auth/bridge-session` | Bridge session |
| `/api/athena-auth/session` | SDK session bridge POST/DELETE |
| `/api/data`, `/api/data/[...all]` | Data proxy |
| `/api/tables/schema` | Table schema (needs current SDK overlay) |
| `/api/preferences/table-sorting` | Table sorting prefs |
| `/api/app-routes` | Route catalog |
| `/api/version-info`, `/api/v` | Version metadata |
| `/api/feedback`, `/api/agentation/**` | Dev/feedback |

### Showcase components

Under `src/components/*-showcase*` and `src/lib/*-showcase*`:

- tables (`table-showcase*`, portable preset/codegen)
- storage / files
- billing
- chat
- emails
- data-hooks
- utils
- sidebar-demo builder (`src/app/sidebar-demo/**`)

### Config / deploy

| File | Role |
| --- | --- |
| `next.config.ts` | Aliases local `packages/athena-js/dist` when present |
| `open-next.config.ts` | OpenNext; runs local athena build before Next |
| `wrangler.jsonc` | Cloudflare Worker |
| `Dockerfile` | Build from monorepo root with workspace package |
| `vitest.config.mjs` | Example unit tests |

## Integration rules (learned)

1. **Env + key once** — shared helpers; pass into every auth + Athena constructor.
2. **Routing modes** — when pointing at a hosted Athena Auth origin from local
   browser, set `ATHENA_AUTH_ROUTING_MODE=direct-upstream` so cookies land on
   the auth domain (see example README).
3. **SDK overlay** — builds run `scripts/build-local-athena.mjs` so table schema
   handlers and current athena-js surfaces work even if lockfile pins older
   published athena.
4. **Do not cache** `createAthenaServerClient` / example server Athena across
   requests.
5. **Portable table/chat exports** — snake_case at file boundary; keep
   config_hash/config_seed + package versions; accept legacy camelCase/dotted
   imports.
6. **Session bridge** — keep payload, cookie names, POST/DELETE handlers, and
   client helpers synchronized with package + SDK contracts.

## Validation for example-only changes

- Focused example Vitest files next to the changed module
- `tsc --noEmit` on the example tsconfig for type failures
- `nx run next-heroui-example:build` for OpenNext/Cloudflare packaging
- On Windows OpenNext `EPERM` symlink failures: confirm Next compile succeeded;
  treat as environment issue; restore generated build-metadata churn if dirty

## Out of scope in this skill

- `examples/native-heroui-example`
- `packages/heroui-native`
- `examples/files-sdks` unless the user explicitly expands scope
