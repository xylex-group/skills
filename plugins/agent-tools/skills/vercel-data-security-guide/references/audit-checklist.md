# Next.js data security audit checklist

Use when reviewing a PR or whole app. Cite file paths and concrete fixes.

Source themes: https://nextjs.org/docs/app/guides/data-security

## 1. Data Access Layer

- [ ] Is there a clear DAL / `data/` (or equivalent) convention?
- [ ] Database clients imported only from server-only modules?
- [ ] Secret env (`process.env` without `NEXT_PUBLIC_`) limited to DAL / server infra?
- [ ] Reads return DTOs (minimal fields), not raw ORM models?
- [ ] Authorization rules live next to data access (not only in UI)?

**Fail if:** `pg` / Prisma / SQL + secrets imported from shared or client-reachable modules.

## 2. `"use client"` files

- [ ] Props are narrow (only fields required to render)?
- [ ] Types do not accept full domain/User/Order records with secrets?
- [ ] No assumption of server privileges in client code?

**Fail if:** Client component accepts `user: User` / `record: FullRow` and parent passes DB results.

## 3. `"use server"` files / Server Actions

- [ ] Arguments validated (zod/schema or equivalent)?
- [ ] Auth re-checked inside the action (not only on the page)?
- [ ] Authorization includes **resource ownership** / role for the target id?
- [ ] Return values filtered to client-needed data?
- [ ] DB access delegated to `server-only` DAL when project uses DAL style?
- [ ] Expensive operations rate-limited where appropriate?
- [ ] No sensitive values captured in closures without need?

**Fail if:** Action takes an id and mutates without ownership check (IDOR).

## 4. Dynamic routes and input

- [ ] `app/**/[param]/**` params validated / constrained?
- [ ] `searchParams` never used as the sole auth signal?
- [ ] Headers / cookies treated as untrusted until verified?

## 5. High-power entrypoints

- [ ] `proxy.ts` / middleware: auth redirects do not skip API/action authz
- [ ] `route.ts` handlers: same validation + authz as actions
- [ ] Consider pen-test / vuln scan cadence for these surfaces

## 6. Environment & module boundaries

- [ ] No accidental `NEXT_PUBLIC_` on secrets
- [ ] Privileged modules use `import 'server-only'`
- [ ] Optional: `experimental.taint` for sensitive objects

## 7. Mutations & CSRF posture

- [ ] Mutations use POST Server Actions / route handlers, not GET side-effects
- [ ] No cookie/cache mutations during render
- [ ] Multi-origin deploy: `serverActions.allowedOrigins` if behind special proxies
- [ ] Multi-instance self-host: shared `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` if needed

## Severity guide

| Severity | Examples |
|----------|----------|
| **Critical** | Unauthenticated destructive action; IDOR delete/update; secrets in client bundle |
| **High** | Full DB row to client; page-only auth for actions; admin via searchParams |
| **Medium** | Over-broad client props; missing rate limits; DAL mixed with ad-hoc SQL |
| **Low** | Missing taint; docs/style inconsistency across approaches |

## Report format

For each issue:

1. **Title** — short failure mode
2. **Where** — path + symbol
3. **Why** — security impact
4. **Fix** — concrete pattern from `patterns.md` / DAL / authz
