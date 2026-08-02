# Pragmatic Biome / Ultracite rule overrides

Use after `ultracite fix` still leaves a large error surface on a brownfield repo. Prefer turning rules **off with a short comment** over silent `// biome-ignore` spam.

## Adoption tiers

### Tier A — almost always off for NodeNext TS monorepos

```jsonc
"correctness": {
  "useImportExtensions": "off",
  "noUnresolvedImports": "off"
}
```

- Project already emits `.js` import paths for `.ts` sources.
- Workspace package names resolve via TS/pnpm, not Biome’s resolver.

### Tier B — mass churn; defer sort/style

```jsonc
"assist": {
  "actions": {
    "source": {
      "useSortedKeys": "off",
      "useSortedInterfaceMembers": "off",
      "useSortedAttributes": "off"
    }
  }
}
```

Plus common style noise: `noNestedTernary`, `noIncrementDecrement`, `useDestructuring`, `useConsistentTypeDefinitions`, `useFilenamingConvention`, `useConsistentArrayType`.

### Tier C — architecture / product reality

| Rule | When off is reasonable |
|------|-------------------------|
| `performance/noBarrelFile` | Public package entry re-exports |
| `performance/noJsxPropsBind` | Existing field renderers / builders |
| `performance/noAwaitInLoops` | Sequential DB migrations/seeds |
| `performance/useTopLevelRegex` | One-shot tooling scripts |
| `complexity/noExcessiveCognitiveComplexity` | Legacy controllers (split later) |
| `complexity/noVoid` | Fire-and-forget intentional voids |
| `style/noNonNullAssertion` | Gradual strictness |
| `style/noExportedImports` | Facade re-export patterns |
| `suspicious/useAwait` | Interfaces requiring async shape |
| `suspicious/noUnnecessaryConditions` | Type-aware false positives |
| `a11y/*` interactive builders | Custom canvas UIs; fix in a11y pass |

## Procedure

1. `biome check --max-diagnostics=5000` → group by rule id.
2. Fix real bugs (unused vars, broken a11y you own this PR, etc.).
3. Disable remaining high-count style rules with comments.
4. Leave `pnpm check` green.
5. Track “re-enable list” in the PR body or a follow-up issue if the user wants strict mode later.

## Do not disable casually

- Security-ish rules (`noDangerouslySetInnerHtml` patterns, `noEval` equivalents)
- Test-only `.only` / focused test bans if present
- Format-related settings (prefer running `fix` instead of fighting format)
