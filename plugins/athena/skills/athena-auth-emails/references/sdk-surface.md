# Athena Auth Email SDK Surface

Use this reference when the task lives in `athena-js` or in a consumer repo
using `@xylex-group/athena`.

## Source of truth order

1. `athena-js/docs/auth/admin.mdx`
2. `athena-js/docs/auth/react-email.mdx`
3. `athena-js/docs/auth/react-email-api.mdx`
4. `athena-js/src/auth/index.ts`
5. `athena-js/src/auth/types.ts`
6. `athena-js/src/auth/client.ts`
7. `athena-js/src/auth/react-email.ts`
8. `athena-js/src/auth/limits.ts`
9. `athena-js/test/auth-client.test.ts`
10. `athena-js/test/browser-entry.test.ts`

If docs and implementation disagree, trust the current exports, types, and
tests in `src/auth/*`.

## Quick grep

```powershell
rg -n "email-template|emailTemplate|renderAthenaReactEmail|defineAuthEmailTemplate|ATHENA_AUTH_MAX_" src/auth docs/auth test/auth-client.test.ts
```

## Canonical SDK naming

Prefer the nested namespace:

- `client.auth.admin.email.list()`
- `client.auth.admin.email.get()`
- `client.auth.admin.email.create()`
- `client.auth.admin.email.update()`
- `client.auth.admin.email.delete()`
- `client.auth.admin.email.failure.*`
- `client.auth.admin.email.template.*`

Treat `client.auth.admin.emailTemplate.*` as the older compatibility alias.
Keep it working when required, but do not make it the primary seam in new docs
or new code.

## React Email helper seam

Inspect `athena-js/src/auth/react-email.ts` when the task involves:

- `renderAthenaReactEmail(...)`
- `createAuthReactEmailInput(...)`
- `defineAuthEmailTemplate(...)`
- `resolveReactEmailPayloadFields(...)`

Important behavior:

- email create and update routes render `react` into `htmlBody` and `textBody`
- email-template create and update routes render `react` into `htmlTemplate` and `textTemplate`
- `react` is stripped from the outbound payload
- template `variables` auto-derive from `Object.keys(react.props)` when omitted

If a consumer bug claims React Email support is broken, inspect this seam before
inventing extra application wrappers.

## Published limits

`athena-js/src/auth/limits.ts` publishes the backend-aligned constants:

- `ATHENA_AUTH_MAX_ADMIN_JSON_BYTES`
- `ATHENA_AUTH_MAX_ADMIN_JSON_DEPTH`
- `ATHENA_AUTH_MAX_TEMPLATE_VARIABLES`
- `ATHENA_AUTH_MAX_TEMPLATE_VARIABLE_LENGTH`
- `ATHENA_AUTH_ADMIN_LIMITS`

Current values:

- bytes: `32768`
- depth: `8`
- template variable count: `64`
- template variable length: `128`

`assertAthenaAuthTemplateVariables(...)` currently enforces the template
variable limits on admin email-template requests. The SDK intentionally does not
guess a broad generic rejection path for every JSON field just because the
backend has size and depth limits.

## Public request and type surface

Inspect `athena-js/src/auth/types.ts` when the task depends on request shapes or
route documentation. Important public request types include:

- `AthenaAdminEmailCreateRequest`
- `AthenaAdminEmailUpdateRequest`
- `AthenaAdminEmailFailureCreateRequest`
- `AthenaAdminEmailFailureUpdateRequest`
- `AthenaAdminEmailTemplateCreateRequest`
- `AthenaAdminEmailTemplateUpdateRequest`

Inspect `athena-js/src/auth/index.ts`, `src/index.ts`, and `src/browser.ts` when
the task is about exports or browser-safe parity.

## Consumer repo rules

- Prefer the SDK helpers that already exist instead of cloning auth email types locally.
- Reuse the exported limit constants when UI or local validation must match backend rules.
- Prove the final request path and payload shape before blaming the backend.
- Do not patch a consumer dry-run or review helper when the real bug belongs in `athena-js` or `athena-auth`.

## Validation

Use targeted SDK tests first:

```powershell
node --import tsx --test --test-force-exit test/auth-client.test.ts test/browser-entry.test.ts
pnpm typecheck
pnpm check:all
```

If the task changes the exported method surface, also run:

```powershell
pnpm docs:methods
```

Treat a clean `pnpm docs:methods` run with no diff as a valid result.
