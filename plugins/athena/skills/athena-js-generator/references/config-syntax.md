# Athena JS Generator Config Syntax

## Contents

1. Minimal configs
2. Output presets and targets
3. Table filters
4. Env-backed syntax
5. Dry-run and write behavior
6. Validation

## Minimal configs

Minimal direct config:

```ts
import { defineGeneratorConfig } from "@xylex-group/athena"

export default defineGeneratorConfig({
  provider: {
    kind: "postgres",
    mode: "direct",
  },
})
```

Minimal gateway config:

```ts
import { defineGeneratorConfig } from "@xylex-group/athena"

export default defineGeneratorConfig({
  provider: {
    kind: "postgres",
    mode: "gateway",
  },
})
```

## Output presets and targets

Key config surface:

```ts
output: {
  format: "define-model" | "table-builder",
  preset: "legacy" | "athena-direct",
  targets: {
    model: string,
    schema: string,
    database: string,
    registry: string,
  },
  placeholderMap: Record<string, string>,
}
```

Default safe direct layout:

- `preset: "athena-direct"`
- `format: "table-builder"`
- `model: "athena/models/{schema_kebab}/{model_kebab}.ts"`
- `schema: "athena/schemas/{schema_kebab}.ts"`
- `database: "athena/relations.ts"`
- `registry: "athena/registry.generated.ts"`

Recommended direct layout:

```ts
output: {
  preset: "athena-direct",
  format: "table-builder",
}
```

That resolves to:

- `athena/models/{schema_kebab}/{model_kebab}.ts`
- `athena/schemas/{schema_kebab}.ts`
- `athena/relations.ts`
- `athena/registry.generated.ts`

Use `output.targets.*` only for explicit overrides. Prefer a preset first,
then override the one target that really differs.

## Table filters

Use generator-side filters to reduce surface area:

```ts
filter: {
  includeTables: ["users", "public.notifications"],
  excludeTables: ["public.audit_logs"],
}
```

Rules:

- bare names such as `"users"` match that table in any selected schema
- schema-qualified names such as `"public.users"` match one exact table
- `includeTables` runs first, then `excludeTables`
- generation fails if the filter removes every table

## Env-backed syntax

Useful env vars:

- `ATHENA_GENERATOR_OUTPUT_FORMAT`
- `ATHENA_GENERATOR_OUTPUT_PRESET`
- `ATHENA_GENERATOR_MODEL_TARGET`
- `ATHENA_GENERATOR_SCHEMA_TARGET`
- `ATHENA_GENERATOR_DATABASE_TARGET`
- `ATHENA_GENERATOR_REGISTRY_TARGET`
- `ATHENA_GENERATOR_TABLES`
- `ATHENA_GENERATOR_EXCLUDE_TABLES`
- `ATHENA_GENERATOR_SCHEMAS`

Preferred env-helper pattern:

```ts
import { defineGeneratorConfig, generatorEnv } from "@xylex-group/athena"

export default defineGeneratorConfig({
  provider: {
    kind: "postgres",
    mode: "direct",
    connectionString: generatorEnv("DATABASE_URL"),
    schemas: generatorEnv.list("ATHENA_GENERATOR_SCHEMAS", {
      default: ["public"],
    }),
  },
  output: {
    format: generatorEnv.oneOf(
      "ATHENA_GENERATOR_OUTPUT_FORMAT",
      ["define-model", "table-builder"] as const,
      { default: "table-builder" },
    ),
    preset: generatorEnv.oneOf(
      "ATHENA_GENERATOR_OUTPUT_PRESET",
      ["legacy", "athena-direct"] as const,
      { default: "athena-direct" },
    ),
  },
  filter: {
    includeTables: generatorEnv.list("ATHENA_GENERATOR_TABLES", { optional: true }),
    excludeTables: generatorEnv.list("ATHENA_GENERATOR_EXCLUDE_TABLES", { optional: true }),
  },
})
```

## Dry-run and write behavior

Dry-run prints:

- active `output.format`
- resolved `model`, `schema`, `database`, and `registry` targets
- warnings when registry output still points at `athena/config.ts`
- the generated file list

Write mode:

- overwrites generated `model` and `schema` files
- preserves existing `database` and `registry` files
- reports protected skips instead of silently hiding them

## Validation

- syntax and normalization: `test/generator-config.test.ts`
- write behavior and filtered snapshots: `test/generator-pipeline.test.ts`
- CLI review output: `test/cli.test.ts`
- full repo gate: `pnpm check:all`
