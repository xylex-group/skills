# Verification checklist

Run after install + script wiring. Use the project package manager (`pnpm exec` / `npx` / `yarn` / `bunx`).

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — no pending changes, or `--write` succeeded |
| `1` | Changes required under `--check` / `--review` |
| `2` | Hard error (bad flags, parse/IO, config) |

`--check` exit **1** is a valid tool response (dirty tree), not a broken install. Exit **2** means setup or CLI failure.

## Required commands

```bash
# Binary
pnpm exec tailwind-canonicalize --version
pnpm exec tailwind-canonicalize --help

# Dry-run (0 or 1 is OK)
pnpm exec tailwind-canonicalize . --check --safe --json

# Favored linter still works (pick one)
pnpm exec biome --version
pnpm exec ultracite --version
pnpm exec eslint --version
pnpm exec oxlint --version

# Composed scripts (if added)
pnpm canonicalize:check
pnpm lint
```

## Pass criteria

| Check | Pass condition |
|-------|----------------|
| Version | Semver printed, exit 0 |
| Help | Help text printed, exit 0 |
| Check run | Exit 0 or 1; JSON/summary present; not "command not found" |
| Package.json | `tailwind-canonicalize` in `devDependencies` |
| Scripts | `canonicalize` / `canonicalize:check` present; `fix`/`check` run canonicalize **before** linter when composed |
| Lint favor | Detected stack still invokable |
| Dual rewrite | No ESLint/plugin rule rewriting arbitrary→theme in parallel without disabling |

## Optional red→green on one file

1. Find or create a file with a provable arbitrary (e.g. `w-[40px]` when theme has `w-10`).
2. `tailwind-canonicalize <file> --check --safe` → expect exit 1 if rewrite pending.
3. `tailwind-canonicalize <file> --write --safe` → exit 0.
4. Re-run `--check` → exit 0.

Do not invent theme matches. Prefer fixtures under the tool’s own repo when developing the package itself.

## Global install (optional)

Only if the user asked for system-wide CLI:

```bash
npm i -g tailwind-canonicalize
tailwind-canonicalize --version
```

Project-local dep remains required for CI reproducibility.

## Failure triage

| Symptom | Fix |
|---------|-----|
| `command not found` | Install local dep; use `pnpm exec` / path to `node_modules/.bin` |
| Exit 2 on `--check` | Inspect flags, Node version (≥20), corrupt paths |
| Huge exit-1 on monorepo root | Scope paths; do not mass `--write` without consent |
| Linter fights class strings | Disable competing semantic rewrite rules; keep one owner |
| Cache stale after theme change | Delete `.tailwind-canonicalize-cache.json` |
