# Athena Auth UI Implementation Map

Paths relative to `packages/heroui/` unless noted.  
**Ignore** `packages/heroui-native/**`.

## Public barrels

| File | Role |
| --- | --- |
| `src/index.ts` | Broad root re-exports |
| `src/pages.tsx` | Route-ready page shells |
| `src/plugins.ts` | Plugin factories + plugin UI |
| `src/primitives.ts` | Low-level UI primitives |
| `src/tables.ts` | Table composition + utilities |
| `src/sidebar.ts` | Dashboard sidebar surface |
| `src/organization.ts` | Organization-focused surface |
| `src/utils.ts` / `icons.ts` / `chat.ts` / `email.ts` | Focused entrypoints |
| `src/client.ts` / `types.ts` | Contracts + mappers (also `/client`, `/types`) |
| `src/athena/*.ts` | Narrow infrastructure entrypoints |
| `src/auth/routing-debug.ts` | Routing-debug helpers |

## Implementation families

| Concern | Primary paths |
| --- | --- |
| Auth forms + router | `src/components/auth/{auth,sign-in,sign-up,sign-out,forgot-password,reset-password,check-email}.tsx`, `src/lib/auth/{routes,auth-view,client-url}.ts` |
| Providers + UI options | `src/components/auth/auth-provider.tsx`, `athena-app-providers.tsx`, `src/lib/auth/{ui-options,auth-plugin}.ts` |
| Plugin factories | `src/lib/auth/*-plugin.ts`; UI under `components/auth/{api-key,delete-user,magic-link,multi-session,organization,passkey,theme,username}` |
| Settings + users | `components/auth/settings/**`, `user/**`, `avatar/**` |
| Organizations | `components/auth/organization/**` — manager, switcher, switcher-control, session-cache, settings, empty states together |
| Workspace / admin | `components/auth/workspace/**` — start `index.ts`, `types.ts`, `client.ts`, `hooks.ts`, `workspace-runtime.ts`, then cards/panels |
| Billing UI | `components/auth/billing/**` + root re-export of billing index |
| Tables | `components/auth/table/**` (`core`, `actions`, `hooks`, `rows`, `utils`, `builder/**`), `src/athena/table-query*.ts` |
| Storage UI | `components/auth/storage/**` |
| Athena transport | `src/lib/athena/**` + public wrappers `src/athena/**` |
| Email templates | `components/auth/email/**` (`template-metadata.ts` critical); barrel `src/email.ts` |
| Chat | `components/auth/chat/**`; barrel `src/chat.ts` |
| Sidebar | `components/auth/sidebar/**`; barrel `src/sidebar.ts` |
| Primitives / feedback | `components/primitives/**`, `hooks/use-copy-to-clipboard.ts`, `lib/{copy-with-feedback,toast,value-utils}.ts` |
| Icons | `components/auth/icons/**` — prefer registries over inline icon blocks |
| Overlays / selects | `components/auth/overlay/**`, `select/**` |
| Routing debug | `src/auth/routing-debug.ts`, `components/auth/experimental/auth-routing-debug-overlay.tsx` |
| Compatibility (internal) | `src/compat/**` — not consumer entrypoints |
| Domain adapters | `src/internal/adapters/**` |
| Domain types | `src/types/**` |

## Generated documentation

Owned by monorepo `docs/` (generated via `scripts/generate-docs.mjs`):

- Exhaustive: `docs/components/**`, `docs/hooks/**`, `docs/functions/**`
- Entrypoints: `docs/entrypoints/**`
- Guides: see `docs/index.mdx`

For any public symbol change, keep aligned:

1. Implementation + types  
2. Focused barrel + root barrel if intended  
3. `package.json` export when adding a subpath  
4. Generated docs page + category index  
5. Example-app consumer + focused tests  

## High-risk contracts

- Base URL / proxy mode, cookie + header forwarding, browser vs server boundaries
- Plugin-contributed views, settings cards, menu items, fields, labels
- Workspace query keys, admin access, mutation invalidation, pagination, skeletons, errors
- Table generics from Athena models; selection/sorting; mobile cards; portable preset normalization
- Email `templateKey` catalog stability
- Symbols that only exist via root re-export or internal compat (must not become the only path without export map support)
- Auth mutation keys package-owned (`authMutationKeys`)

## Tests

Package tests live in `packages/heroui/tests/**` (Vitest). Families mirror seams:
auth forms, proxy, base-url, tables, workspace cards, billing presets, email,
routing-debug, icons, toast, export-boundary, docs-generate-exports, etc.

Browser config: `vitest.config.ts`  
Release config: `vitest.release.config.ts`

## Build

- Vite library build: `packages/heroui/vite.config.ts`
- Scripts: `build`, `test`, `test:browser`, `publint`, `attw`, `pack:dry-run`
