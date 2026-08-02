# Athena Auth UI Implementation Map

## Public barrels

- `src/index.ts`: broad root re-exports.
- `src/pages.tsx`: route-ready page shells.
- `src/plugins.ts`: plugin factories and plugin-owned UI.
- `src/primitives.ts`: reusable low-level UI.
- `src/tables.ts`: complete table composition and utility surface.
- `src/utils.ts`, `src/icons.ts`, `src/chat.ts`, `src/email.ts`: focused entrypoints.
- `src/athena/*.ts` and `src/auth/routing-debug.ts`: narrow infrastructure entrypoints.

## Implementation families

| Concern | Primary implementation paths |
| --- | --- |
| Auth forms and routing | `src/components/auth/{auth,sign-in,sign-up,sign-out,forgot-password,reset-password,check-email}.tsx`, `src/lib/auth/{routes,auth-view,client-url}.ts` |
| Providers and UI options | `src/components/auth/auth-provider.tsx`, `src/lib/auth/{ui-options,auth-plugin}.ts` |
| Plugin factories | `src/lib/auth/*-plugin.ts`; plugin UI under `src/components/auth/{api-key,delete-user,magic-link,multi-session,organization,passkey,theme,username}` |
| Settings and users | `src/components/auth/settings/**`, `src/components/auth/user/**`, `src/components/auth/avatar/**` |
| Organizations | `src/components/auth/organization/**`; preserve manager, switcher, settings, role/member, invitation, and empty-state behavior together |
| Org switcher (connected) | `organization-switcher-control.tsx`, `use-organization-switcher.ts`, `organization-session-cache.ts`; guide `docs/organization-switcher.mdx` — session cache sync on switch, no required `router.refresh()` |
| Workspace/admin | `src/components/auth/workspace/**`; start with `index.ts`, `types.ts`, `client.ts`, `hooks.ts`, `workspace-runtime.ts`, then the relevant card/panel/settings wrapper |
| Tables | `src/components/auth/table/**`, `src/athena/table-query-executor.ts` (SDK re-export), `hooks/use-athena-query.ts`; inspect `core`, `actions`, `hooks`, `rows`, and `utils` together |
| Athena transport | `src/lib/athena/{base-url,client,proxy,query-client,request-headers}.ts`; public wrappers live in `src/athena/**` |
| Email templates | `src/components/auth/email/**`, especially `template-metadata.ts`; `src/email.ts` is the focused barrel |
| Chat | `src/components/auth/chat/**`; `src/chat.ts` is the focused barrel |
| Primitives and feedback | `src/components/primitives/**`, `src/hooks/use-copy-to-clipboard.ts`, `src/lib/{copy-with-feedback,toast,value-utils}.ts` |
| Icons | `src/components/auth/icons/**`; do not add inline icon blocks when the shared registries can own the icon |
| Routing debug | `src/auth/routing-debug.ts`, `src/components/auth/experimental/auth-routing-debug-overlay.tsx`, and the real example-app proxy/direct route |
| Compatibility | `src/compat/**`; internal adapters only, not consumer entrypoints |

## Generated documentation

`docs/components/index.mdx`, `docs/hooks/index.mdx`, and `docs/functions/index.mdx` are exhaustive generated catalogs. Each item has a dedicated page under the matching directory. Entry-point documentation is under `docs/entrypoints/**`; cross-cutting behavior is documented in `docs/customization.mdx`, `docs/admin-access.mdx`, and `docs/auth-proxy-routing-and-cookies.mdx`.

For any changed public symbol, inspect and keep aligned:

1. Concrete implementation and exported types.
2. Focused barrel and root barrel where applicable.
3. Manifest subpath export when adding an entrypoint.
4. Dedicated generated docs page and category index.
5. Example-app consumer and focused tests.

## High-risk contracts

- Base URL and proxy mode selection, cookie/header forwarding, and browser/server boundaries.
- Plugin-contributed auth views, settings cards, user-menu items, fields, and localized labels.
- Workspace query keys, session/admin access, mutation invalidation, pagination, skeletons, and errors.
- Table generic types derived from Athena models, selection/sorting state, mobile rendering, and portable config normalization.
- Email `templateKey` metadata and catalog stability.
- Public symbols accidentally available only through a root re-export or internal compatibility file.
