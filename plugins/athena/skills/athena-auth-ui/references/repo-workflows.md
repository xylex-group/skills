# Athena Auth UI Repo Workflows

## Contents

1. Read order
2. Repo seams to preserve
3. Validation gates
4. Publishing and docs commands
5. Known gotchas

## Read order

When working inside the `athena-auth-ui` monorepo, inspect sources in this order:

1. `packages/heroui/package.json`
2. The exact barrel in `packages/heroui/src/{index,pages,plugins,primitives,tables,utils,icons,chat,email}.ts[x]` or `src/athena/**`
3. `docs/entrypoints/index.mdx`, the relevant generated component/hook/function page, and any cross-cutting guide
4. The concrete `packages/heroui/src/**` implementation and nearest tests
5. `examples/next-heroui-example` when the seam is consumed there
6. The relevant package and docs build targets

If docs and source disagree in the repo, prefer the current checkout. If the issue is about consumer imports, prefer the current export map in `packages/heroui/package.json`.

## Repo seams to preserve

Preserve the existing seams rather than creating adjacent ones.

### Publish and export surface

Treat `packages/heroui` as the publish surface. The monorepo root is protected from accidental publish.

Current learned behavior from recent repo work:

- trust `packages/heroui/package.json` over deep `dist/*.d.ts` or repo-local `src/compat/*` when deciding what consumers can import
- if a consumer-facing entrypoint changes, update the export map and generated docs together
- if a symbol changes, update the focused barrel, root barrel where intended, implementation, generated docs, and examples together
- do not paper over export drift by telling consumers to deep-import internals

### Upstream URL resolution

Treat `resolveAthenaAuthUpstreamUrl` as the canonical upstream/base-url seam.

Current learned behavior from recent repo work:

- accept either a raw string or an env-object shape where supported
- keep env precedence aligned with the existing helper contract
- use the example app proxy route as the canonical env-object consumption example

Do not add a second helper just to read env vars if the resolver can absorb that behavior.

### Runtime auth bridges

For passkey or social-auth behavior, inspect the real consumer bridge before changing upstream code.

Current learned behavior from recent repo work:

- the decisive passkey seam is the actual `navigator.credentials.create()` payload, not only the request that fetched options
- social auth redirect data can arrive as either `url` or `data.url`, so keep redirect normalization in a small shared helper
- when the visible bug is on the auth page, inspect the component consuming the auth response before changing proxy status codes or backend behavior

### Empty states and HeroUI primitives

Treat the reusable empty-state components and installed `@heroui/react` primitives as the first choice.

Current learned behavior from recent repo work:

- `AvatarGroupEmptyState` already exists and is reused by organization-manager surfaces
- the members-table empty state is a real extension seam
- do not add `@heroui-pro/react` unless the workspace already installs it and the task explicitly requires it

### Example table and chat showcase exports

Treat the example-app showcase config formats as portable contracts, not just UI state dumps.

Current learned behavior from recent repo work:

- table builder exports should generate snake_case JSON keys at the file boundary, while the React builder state can stay camelCase internally
- table identifiers should export as object paths such as `{ "schema_name": "public", "table_name": "case_tasks" }`, not dotted strings like `public.case_tasks`
- column display paths should export as object paths with `schema_name`, `table_name`, and `column_name`; importers should still accept legacy dotted strings and legacy camelCase keys
- exported table columns should include a stable `index` and `translation_key`
- exported table actions and filters should use snake_case fields such as `open_in_new_tab`, `value_column_key`, and `source_option_id`
- exported table and chat presets should include deterministic config identity (`config_hash`, `config_seed`) and package versions for `@xylex-group/athena` and `@xylex-group/athena-auth-ui`
- chat export should include the effective session token, including the live Better Auth session token when the config input is blank
- keep export preview fields, disabled config hash/seed inputs, import parsing, tests, and docs in sync when changing the preset shape

When implementing this seam, build small normalizers around the file boundary:

- serialize current state into the new portable JSON shape
- normalize imported snake_case, legacy camelCase, object paths, and dotted paths into the existing runtime state shape
- compute deterministic hashes/seeds from the exported portable payload, not from incidental UI-only state

### Shared table types and action bars

The table package exports generic helper types used by the example app.

Current learned behavior from recent repo work:

- `AthenaTableActionBar` is used both by the table shell and standalone example surfaces; props such as `selectedKeys`, `selectedRows`, and `tableLabel` should remain optional when standalone usage does not need them
- `AthenaModelRow<TModel>` must accept the real metadata shape from `@xylex-group/athena`, including column and relation metadata, rather than constraining metadata records to `never`
- if a pasted failure is from the example app build, inspect the example component that instantiates the shared package component before widening the public API

## Validation gates

Run the narrowest gate that matches the seam you changed.

Package-targeted checks:

```bash
bunx biome check <touched-files>
bunx nx run-many -t typecheck
bunx nx run @xylex-group/athena-auth-ui:build
```

Package-local scripts currently include `test`, `test:browser`, `build`, `publint`, `attw`, and `pack:dry-run`. Re-read the manifest before invoking them because script names can drift.

If the public contract changed, also run:

```bash
bun run docs:generate
```

Example-app checks:

```bash
bunx nx run next-heroui-example:build
```

The example app may not have an Nx `typecheck` target. If a type failure is pasted from the app surface, use the app `tsconfig.json` directly when needed:

```bash
cd examples/next-heroui-example
bunx tsc --noEmit --project tsconfig.json
```

Browser/runtime checks:

- Use a real browser or browser-driven test when the bug depends on passkeys, redirects, or stylesheet load order.
- Do not stop at static tests when the issue depends on runtime browser APIs.

Root workspace checks:

```bash
bun run lint
bun run typecheck
bun run build
bun run docs:generate
```

Alternative documented checks from the published docs:

```bash
pnpm typecheck
pnpm check:all
```

Match the proof to the reported failure. If the failure came from the example app build, do not stop after package typecheck.

## Publishing and docs commands

Documented repo-level commands:

```bash
bun run package:publish
bun run package:publish:check
```

Documented direct package publish path:

```bash
pnpm --filter @xylex-group/athena-auth-ui publish --access public
```

Use publish checks before publish when the task is release-facing.

## Known gotchas

- The root export surface can be narrower than deep `.d.ts` discovery or repo-local `src/**` paths suggest. Confirm consumer imports against `packages/heroui/package.json`.
- The published CSS contract is `@import "@xylex-group/athena-auth-ui/styles";` alongside `tailwindcss` and `@heroui/styles`; start at the example-app import chain when styles appear missing.
- `next-heroui-example` may not expose every target you expect. A past run confirmed there was no `typecheck` target there, so verify the actual Nx targets before assuming one exists.
- `next-heroui-example:build` can compile Next successfully on Windows and then fail in the OpenNext bundle phase with `EPERM` while creating symlinks under `.open-next`. Treat that as an environment/OpenNext Windows limitation after confirming the Next compile and page generation passed; restore any generated `src/generated/build-metadata.json` churn from the build.
- If direct example `tsc` reports missing test modules such as `vitest` or `@testing-library/react`, check whether the example package declares the test dev dependencies before treating it as an app code error.
- Root lint can fail on unrelated formatting drift. Do not mass-format unrelated files just to make a broad lint gate green unless the user asked for that cleanup.
- React Email props can be stricter than ordinary component interfaces. Prefer one compatibility seam near the template adapter or sync layer over broad type widening.
- Prefer public entrypoints and existing wrappers over new deep-import seams.
