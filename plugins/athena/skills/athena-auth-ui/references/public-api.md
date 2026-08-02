# Athena Auth UI Public API

Always re-read live files; this inventory is routing guidance.

- Manifest: `packages/heroui/package.json`
- Root barrel: `packages/heroui/src/index.ts`
- Focused barrels: `src/{pages,plugins,primitives,tables,utils,icons,chat,email,organization,sidebar,client,types}.ts[x]`
- Athena helpers: `packages/heroui/src/athena/*.ts`
- Routing debug: `packages/heroui/src/auth/routing-debug.ts`
- Docs index: `docs/index.mdx`, `docs/entrypoints/index.mdx`
- Symbol catalogs: `docs/components/index.mdx`, `docs/hooks/index.mdx`, `docs/functions/index.mdx`

Package name: **`@xylex-group/athena-auth-ui`**.  
Live version: read `packages/heroui/package.json` (do not hardcode).

## Published entrypoints

| Import | Barrel | Use |
| --- | --- | --- |
| `@xylex-group/athena-auth-ui` | `src/index.ts` | Full consumer surface: auth, settings, orgs, workspace/admin, billing, tables, pages, plugins, options, Athena helpers, routing-debug re-exports |
| `.../organization` | `src/organization.ts` | Organization manager, `OrganizationSwitcher`, connected `OrganizationSwitcherControl`, `useOrganizationSwitcher`, session-cache helpers |
| `.../pages` | `src/pages.tsx` | Route-ready auth + settings page shells |
| `.../plugins` | `src/plugins.ts` | Plugin factories + plugin-owned UI (API keys, passkeys, orgs, username, magic link, multi-session, theme, delete-user, workspace, …) |
| `.../primitives` | `src/primitives.ts` | Cards, tabs, animated height, copy actions, clipboard hooks, feedback helpers |
| `.../tables` | `src/tables.ts` | Athena/DataTable shell, action bars, hooks, sorting/selection/pagination, renderers, model row types, table query helpers, builder/codegen |
| `.../sidebar` | `src/sidebar.ts` | Dashboard sidebar composition surface |
| `.../utils` | `src/utils.ts` | Clipboard, toast, value utilities |
| `.../icons` | `src/icons.ts` | Athena, Gravity, Lucide, sidebar icon registries/renderers |
| `.../chat` | `src/chat.ts` | Chat message UI + room utilities |
| `.../email` | `src/email.ts` | Transactional email components + template metadata/catalog |
| `.../client` | `src/client.ts` | Form→request mappers, challenge/error/session view parsers, flow-state helpers |
| `.../types` | `src/types.ts` | Presentation views, form/request DTOs, session/user/error contracts |
| `.../auth/routing-debug` | `src/auth/routing-debug.ts` | Serializable proxy/direct-upstream routing-debug config + state helpers |
| `.../athena/base-url` | `src/athena/base-url.ts` | Auth base URL and upstream resolution |
| `.../athena/client` | `src/athena/client.ts` | Browser/server Athena Auth client creation |
| `.../athena/proxy` | `src/athena/proxy.ts` | Framework route/proxy handlers and cookie forwarding |
| `.../athena/query-client` | `src/athena/query-client.ts` | TanStack Query defaults / SSR hydration for Auth UI (`createAuthUiTanstackQueryClient`) |
| `.../athena/request-headers` | `src/athena/request-headers.ts` | Selective auth request-header forwarding |
| `.../athena/table-query` | `src/athena/table-query.ts` | Compat re-export of SDK `executeAthenaReadQuery` / definition types |
| `.../styles` | `src/styles.css` → `dist/styles.css` | Package styles (side-effect CSS) |

Manifest wins if this table drifts.  
**Not published:** `src/compat/**`, deep component paths, Vite chunk paths.

## Standard setup

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "@xylex-group/athena-auth-ui/styles";
```

```tsx
import {
  AuthProvider,
  SignInPage,
  createAthenaAuthClient,
  createAthenaAuthPlugins,
} from "@xylex-group/athena-auth-ui"

// Resolve URL + key once in app code (aliases optional; pass explicit values)
const authClient = createAthenaAuthClient({
  baseUrl: athenaUrl,
  key: athenaKey,
})
const plugins = createAthenaAuthPlugins()

export function AuthScreen() {
  return (
    <AuthProvider authClient={authClient} plugins={plugins}>
      <SignInPage />
    </AuthProvider>
  )
}
```

Patterns to prefer from the example app:

- Env resolution centralized (example: `src/lib/athena.ts` + server variants)
- TanStack: `getAuthUiTanstackQueryClient()` from the package
- Routing modes: proxy vs `direct-upstream` via routing-debug helpers
- Core Athena data client: `@xylex-group/athena` / `next/client` / `next/server`
  façades — not reimplemented inside Auth UI

## Query client naming trap

| Symbol | Package | Stack |
| --- | --- | --- |
| `createAuthUiTanstackQueryClient` / `getAuthUiTanstackQueryClient` | `@xylex-group/athena-auth-ui` | TanStack Query (Auth UI) |
| `createAthenaQueryClient` | `@xylex-group/athena/react` | Athena-native query runtime |

Do not mix them.

## Cross-cutting guides (docs/)

| Guide | When |
| --- | --- |
| `customization.mdx` | `ui` overrides, slots, copy, routes |
| `auth-proxy-routing-and-cookies.mdx` | `/api/auth`, redirects, cookies |
| `admin-access.mdx` | workspace permission failures |
| `athena-client-v3.mdx` | createClient / key / withContext |
| `data-hooks.mdx` | useAthenaQuery vs SDK read query |
| `athena-tables.mdx` | table layout / pageSize |
| `organization-switcher.mdx` | connected switcher + session cache |
| `toast-and-network-requests.mdx` | toast + NetworkRequestRunner |
| `auth-mutation-keys.mdx` | package-owned mutation keys |
| `typing-and-package-exports.mdx` | declaration completeness (2.2.0+) |
| `package-boundary.mdx` | auth vs product surfaces |
| `auth-ui-contracts.mdx` | `/types` + `/client` contracts |
| `layered-contract-policy.mdx` | ADR 0021 pointer |

## Peers (minimum mental model)

Re-read `peerDependencies` in the manifest. High-signal pins:

- `@xylex-group/athena` >= 3.6.4
- `@heroui/react` + `@heroui/styles` >= 3.0.4
- `react` / `react-dom` >= 19
- `@tanstack/react-query` >= 5.100.9
- `@better-auth-ui/core` + `@better-auth-ui/react` >= 1.6.15
