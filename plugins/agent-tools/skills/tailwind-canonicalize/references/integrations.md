# Integration recipes (copy-paste)

Canonicalize owns **semantic Tailwind rewrites**. The favored linter owns format/lint. Always run canonicalize **before** format/fix when both write files.

## Ownership

| Concern | Owner |
|---------|--------|
| Format, imports, unused vars, a11y | Biome / Ultracite / ESLint / Oxlint / Prettier |
| `w-[40px]` → `w-10`, migrations, tokens | tailwind-canonicalize |
| Class sort only | eslint-plugin-tailwindcss / Prettier plugin (optional) |

## Detect favor (quick)

1. `ultracite` in package.json → Ultracite  
2. `biome.json(c)` / `@biomejs/biome` → Biome  
3. `eslint.config.*` / eslint scripts → ESLint  
4. `oxlint` / `.oxlintrc*` → Oxlint  
5. Prettier only → Prettier  
6. None → CLI scripts only  

## package.json by stack

### Biome

```json
{
  "scripts": {
    "canonicalize": "tailwind-canonicalize . --write --safe",
    "canonicalize:check": "tailwind-canonicalize . --check --json",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "fix": "pnpm canonicalize && pnpm lint:fix",
    "check": "pnpm canonicalize:check && pnpm lint"
  }
}
```

### Ultracite

```json
{
  "scripts": {
    "canonicalize": "tailwind-canonicalize . --write --safe",
    "canonicalize:check": "tailwind-canonicalize . --check",
    "lint": "ultracite check",
    "fix": "tailwind-canonicalize . --write --safe && ultracite fix",
    "check": "tailwind-canonicalize . --check && ultracite check"
  }
}
```

### ESLint

```json
{
  "scripts": {
    "canonicalize": "tailwind-canonicalize . --write --safe",
    "canonicalize:check": "tailwind-canonicalize . --check",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "fix": "pnpm canonicalize && pnpm lint:fix",
    "check": "pnpm canonicalize:check && pnpm lint"
  }
}
```

Disable ESLint rules that rewrite arbitrary values to theme scales if present. Keep sort/conflict rules if wanted.

### Oxlint

```json
{
  "scripts": {
    "canonicalize": "tailwind-canonicalize . --write --safe",
    "canonicalize:check": "tailwind-canonicalize . --check",
    "lint": "oxlint .",
    "fix": "pnpm canonicalize",
    "check": "pnpm canonicalize:check && pnpm lint"
  }
}
```

### Oxlint + Biome

```json
{
  "scripts": {
    "fix": "tailwind-canonicalize . --write --safe && biome check --write .",
    "lint": "oxlint . && biome check .",
    "check": "tailwind-canonicalize . --check && oxlint . && biome ci ."
  }
}
```

### Prettier only

```json
{
  "scripts": {
    "canonicalize": "tailwind-canonicalize . --write --safe",
    "canonicalize:check": "tailwind-canonicalize . --check",
    "format": "prettier --write .",
    "fix": "pnpm canonicalize && pnpm format",
    "check": "pnpm canonicalize:check && prettier --check ."
  }
}
```

## lint-staged (ordered)

```json
{
  "*.{js,jsx,ts,tsx,mjs,cjs,vue,astro,svelte,html,mdx}": [
    "tailwind-canonicalize --write",
    "biome check --write --no-errors-on-unmatched"
  ]
}
```

| Stack | Second command |
|-------|----------------|
| Biome | `biome check --write --no-errors-on-unmatched` |
| Ultracite | `ultracite fix` or biome equivalent |
| ESLint | `eslint --fix --max-warnings=0` |
| Oxlint | `oxlint` |
| Prettier | `prettier --write` |

Husky pre-commit:

```sh
#!/usr/bin/env sh
pnpm exec lint-staged
```

## Ignores

Add to Biome / ESLint / Oxlint ignores when useful:

- `.tailwind-canonicalize-cache.json`
- `dist`, `node_modules`
- Generated token CSS if machine-only (optional)

Biome example fragment:

```jsonc
{
  "files": {
    "includes": [
      "**",
      "!**/node_modules",
      "!**/dist",
      "!**/.tailwind-canonicalize-cache.json"
    ]
  }
}
```

## CI

```yaml
- name: Tailwind canonicalize
  run: pnpm exec tailwind-canonicalize . --check --json --safe

- name: Lint
  run: pnpm lint
```

Large trees: `--workers --incremental`.

## Turborepo sketch

```json
{
  "tasks": {
    "canonicalize": { "cache": false },
    "lint": { "dependsOn": ["canonicalize"] }
  }
}
```

## Conflict matrix

| Anti-pattern | Why |
|--------------|-----|
| Two tools rewrite class semantics | Non-deterministic diffs |
| Prettier class-sort after token apply | Noise; one orderer max |
| Canonicalize as `eslint --fix` for style | Wrong abstraction |
| Dual formatters on same files | Save loops |

## CLI flags (common)

| Flag | Use |
|------|-----|
| `--write` / `-w` | Apply rewrites |
| `--check` | CI gate (exit 1 if dirty) |
| `--safe` | Default high-confidence only |
| `--review` | Propose, never write |
| `--json` | Machine summary |
| `--migrate --from-tailwind 3 --to-tailwind 4` | Version migrations |
| `--strict-compile` | Needs peer `tailwindcss` |
| `--workers` / `--incremental` | Large repos |

Supported extensions: `ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs`, `mts`, `cts`, `html`, `vue`, `astro`, `svelte`, `mdx`.
