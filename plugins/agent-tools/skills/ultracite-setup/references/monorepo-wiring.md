# Monorepo wiring notes

## Where deps live

- Install `ultracite`, `@biomejs/biome`, `husky`, `lint-staged` at the **workspace root**.
- Single root `biome.jsonc` covering apps + packages.
- Root owns `check` / `fix` / `lint` / `format`.

## Package-level scripts

Prefer root-only lint. If a package needs `lint`:

```json
{
  "scripts": {
    "lint": "pnpm -w exec ultracite check packages/my-pkg",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  }
}
```

Do not replace `typecheck` with Ultracite alone.

## Ignores

Typical exclusions:

- `node_modules`, `dist`, `.next`, `coverage`, `.turbo`, build artifacts
- Lockfiles (`pnpm-lock.yaml`)
- Generated dumps (`docs/SPEC.json`, large seed JSON) if they thrash format or trip parse rules

Biome 2 + Ultracite: when the extended preset already uses a catch-all include, only add **negations** (`!**/…`). Do not re-add `"**"`.

## Init artifacts to re-check

| Artifact | Fix if needed |
|----------|----------------|
| `.vscode/settings.json` | Top-level formatter must be Biome |
| `.husky/pre-commit` | Clean single lint-staged invocation |
| `.lintstagedrc.json` | `pnpm exec ultracite fix` (local) |
| `package.json` `format` | Not `prettier --write` |
| `AGENTS.md` | Merge; never clobber project rules |

## pnpm + prepare

`"prepare": "husky"` runs on install so hooks install for teammates. Ensure `.husky/_` is committed as husky expects for v9.
