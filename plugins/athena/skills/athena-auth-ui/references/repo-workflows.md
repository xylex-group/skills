# Athena Auth UI Repo Workflows

Scope: **packages/heroui** + **examples/next-heroui-example** (+ generated
`docs/**` and monorepo root scripts). Ignore heroui-native.

## Read order

1. `packages/heroui/package.json`
2. Exact barrel under `packages/heroui/src/`
3. `docs/entrypoints/index.mdx` + generated page / guide
4. Concrete implementation + `packages/heroui/tests/**`
5. `examples/next-heroui-example` consumer when integration is involved
6. Package/example build targets

If docs and source disagree, prefer current checkout source + export map for
runtime; regenerate docs to restore the consumer contract.

## Seams to preserve

### Publish and export surface

- Publishable package is **only** `packages/heroui` → `@xylex-group/athena-auth-ui`
- Monorepo root is protected (`prepublishOnly` fails on root publish)
- Consumer-facing entrypoint changes must update export map + barrels + docs
- Do not tell consumers to deep-import `dist` or `src/compat`

### Upstream URL resolution

- Canonical helpers: `resolveAthenaAuthUpstreamUrl` / base-url module
- Accept string or env-object shapes where the helper already does
- Example proxy route is the canonical env-object consumption reference

### Runtime auth bridges

- Passkeys: inspect actual `navigator.credentials.create()` payload, not only
  the options-fetch request
- Social redirects may arrive as `url` or `data.url` — normalize once
- Visible auth-page bugs: inspect the component consuming the response before
  changing proxy status codes or backends

### Empty states and HeroUI

- Prefer package empty-state components (`TableEmptyState`, avatar-group empty,
  workspace empty) and installed `@heroui/react` primitives
- Do not add `@heroui-pro/react` unless already in the workspace and required

### Example portable table / chat presets

- File boundary: snake_case keys
- Table identifiers as objects: `{ schema_name, table_name }` not `public.table`
- Column paths: `{ schema_name, table_name, column_name }`; accept legacy dotted
  strings on import
- Include stable `index`, `translation_key`, config_hash/seed, package versions
- Chat export should include effective session token when configured
- Keep preview fields, import parsers, tests, and docs synchronized

### Shared table types and action bars

- `AthenaTableActionBar` props used standalone in the example must remain
  optional where appropriate
- `AthenaModelRow<TModel>` must accept real Athena model metadata shapes
- Example build failures: inspect the example instantiator before widening the
  public package API

### Athena JS overlay

- Root `bun run athena-js:build` / example build scripts overlay local
  `packages/athena-js` when present
- Page-data collection for `/api/tables/schema` can fail on stale published
  athena without the overlay

## Validation gates

Package-targeted:

```bash
bunx biome check <touched-files>
bun run athena-js:build
bunx nx run @xylex-group/athena-auth-ui:build
# from packages/heroui when using package scripts:
# bun run test
# bun run test:browser
```

Public contract:

```bash
bun run docs:generate
bun run package:publish:check   # no publish
```

Example-app:

```bash
bunx nx run next-heroui-example:build
# or
cd examples/next-heroui-example && bunx tsc --noEmit --project tsconfig.json
```

Workspace:

```bash
bun run lint
bun run typecheck
bun run package:build
bun run test
```

Package manager is **bun** for this monorepo. Prefer `bun x nx` over global nx.

## Publishing

```bash
bun run package:publish:check
bun run package:publish
```

Versioning (Nx Release / conventional commits):

```bash
bun run version:patch   # or version:minor / version
```

Bumps `packages/heroui/package.json`, changelog, tags as configured.

## Known gotchas

- Root export surface can be narrower than deep `.d.ts` discovery suggests
- CSS contract requires package styles **and** `@heroui/styles` + Tailwind
- Example may lack an Nx `typecheck` target — use `tsc` directly
- Windows OpenNext: Next compile OK + `.open-next` symlink `EPERM` is often an
  environment limit; restore `src/generated/build-metadata.json` churn
- Example `tsc` missing `vitest` / Testing Library means check example
  devDependencies before blaming app code
- Root lint may fail on unrelated Biome drift — do not mass-format unrelated
  files unless asked
- React Email props are strict — prefer a thin adapter seam over broad widening
- Prefer public entrypoints over new deep-import seams
- **Do not** modify `packages/heroui-native` under this skill
