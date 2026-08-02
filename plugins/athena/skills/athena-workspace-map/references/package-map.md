# Quick package map (Athena monorepo)

## JS

| Need | Path | Import |
| --- | --- | --- |
| Client, query, React query client, generator | `packages/athena-js` | `@xylex-group/athena`, `@xylex-group/athena/react` |
| Auth UI, settings, tables UI | `packages/athena-auth-ui` | auth-ui package exports |
| Better Auth adapter | `packages/better-auth-athena` | `@xylex-group/better-auth-athena` |
| App scaffold | `packages/create-athena-app` | CLI `create-athena-app` |
| Python | `packages/athena-py` | Python tree |

## Apps

| Need | Path |
| --- | --- |
| Operator UI | `apps/web` |
| Docs product site | `apps/docs` |
| Desktop | `apps/desktop` |
| Marketing | `apps/marketing` |
| Edge Athena wrapper | `apps/cloudflare-athena` |
| D1 proxy | `apps/cloudflare-d1-proxy` |
| WSS | `apps/wss-gateway`, `apps/athena-wss-gateway-rust` |

## Services

| Need | Path |
| --- | --- |
| Auth Worker | `services/athena-auth` |
| Operator service | `services/athena-operator` |

## Rust

| Need | Path |
| --- | --- |
| Server/runtime | `src/` + `crates/*` |
| SQL | `sql/` |
| OpenAPI | `openapi.yaml`, `openapi-wss.yaml` |

## Consumer vs package

| Clue | Destination |
| --- | --- |
| GitHub path under app repo `src/` | Consumer app |
| Symbol only in `packages/athena-js/src/react` | athena-js |
| Component under auth-ui `src` / heroui packages | athena-auth-ui |
| TODO about local provider wrapping SDK | Consumer, SDK already stable if using `AthenaQueryClientProvider` + `useMemo` |
