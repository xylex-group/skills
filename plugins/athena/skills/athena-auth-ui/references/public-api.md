# Athena Auth UI Public API

## Contract discovery

Always inspect the current files rather than treating this inventory as frozen:

- Published subpaths: `packages/heroui/package.json`
- Root symbols: `packages/heroui/src/index.ts`
- Narrow symbols: `packages/heroui/src/{pages,plugins,primitives,tables,utils,icons,chat,email}.ts[x]`
- Athena helpers: `packages/heroui/src/athena/*.ts`
- Generated index: `docs/entrypoints/index.mdx`
- Complete generated symbol catalogs: `docs/components/index.mdx`, `docs/hooks/index.mdx`, and `docs/functions/index.mdx`

## Published entrypoints

| Import | Barrel or implementation | Use |
| --- | --- | --- |
| `@xylex-group/athena-auth-ui` | `src/index.ts` | Complete supported consumer surface: auth, settings, organizations, workspace/admin, email, tables, pages, plugins, options, and Athena helpers |
| `/organization` | `src/organization.ts` | Organization manager, presentational `OrganizationSwitcher`, connected `OrganizationSwitcherControl`, `useOrganizationSwitcher`, session-cache helpers |
| `/pages` | `src/pages.tsx` | Route-ready auth and settings page shells |
| `/plugins` | `src/plugins.ts` | Plugin factories and plugin-owned UI for API keys, passkeys, organizations, username, magic link, multi-session, themes, delete-user, and workspace |
| `/primitives` | `src/primitives.ts` | Cards, tabs, animated height, copy actions, clipboard hooks, and feedback helpers |
| `/tables` | `src/tables.ts` | Athena/DataTable components, action bars, hooks, sorting, selection, pagination, renderers, formatters, model-derived row types, and table query helpers |
| `/utils` | `src/utils.ts` | Clipboard, toast, and value utilities |
| `/icons` | `src/icons.ts` | Athena, Gravity, and sidebar icon registries/renderers |
| `/chat` | `src/chat.ts` | Chat components and room utilities |
| `/email` | `src/email.ts` | Transactional email components and stable template metadata/catalog helpers |
| `/auth/routing-debug` | `src/auth/routing-debug.ts` | Serializable proxy/direct-upstream routing-debug config and state helpers |
| `/athena/base-url` | `src/athena/base-url.ts` | Athena Auth base URL and upstream resolution |
| `/athena/client` | `src/athena/client.ts` | Browser and server Athena Auth client creation |
| `/athena/proxy` | `src/athena/proxy.ts` | Framework route/proxy handlers and cookie forwarding |
| `/athena/query-client` | `src/athena/query-client.ts` | React Query client defaults and SSR/hydration support |
| `/athena/request-headers` | `src/athena/request-headers.ts` | Selective auth request-header forwarding |
| `/athena/table-query` | `src/athena/table-query.ts` | Compat re-export of `@xylex-group/athena` `executeAthenaReadQuery` / definition |
| `/athena/query-client` | `src/lib/athena/query-client.ts` | TanStack helpers: prefer `createAuthUiTanstackQueryClient` (not athena/react) |
| `/styles` | `src/styles.css` via built `dist/styles.css` | Package styles |

The manifest is authoritative if this list drifts.

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

const athenaUrl =
  process.env.NEXT_PUBLIC_ATHENA_URL?.trim() ||
  process.env.ATHENA_URL?.trim() ||
  process.env.ATHENA_GATEWAY_URL?.trim() ||
  process.env.NEXT_PUBLIC_ATHENA_DB_API_URL?.trim() ||
  ""
const athenaKey =
  process.env.NEXT_PUBLIC_ATHENA_API_KEY?.trim() ||
  process.env.ATHENA_API_KEY?.trim() ||
  process.env.ATHENA_GATEWAY_API_KEY?.trim() ||
  process.env.X_API_KEY?.trim() ||
  ""

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

Keep Athena env resolution in one shared app-owned helper instead of scattering raw `process.env` fallback chains across browser auth clients, server auth clients, and Athena core client constructors.

Merge consumer overrides into the existing `ui` tree. Use the exact component/hook/function docs page for props, return values, requirements, and source links.
