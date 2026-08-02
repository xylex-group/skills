# Athena JS Typed Schema Registry Surface

## Contents

1. Preferred authoring styles
2. Typed client and `fromModel`
3. Consumer repo rules
4. Form helpers
5. Validation

## Preferred authoring styles

Preferred new authoring style:

```ts
import { boolean, createTypedClient, defineDatabase, defineRegistry, defineSchema, string, table } from "@xylex-group/athena"

const users = table("users")
  .schema("public")
  .columns({
    id: string().generated(),
    email: string(),
    active: boolean().defaulted(),
  })
  .primaryKey("id")

const registry = defineRegistry({
  app: defineDatabase({
    public: defineSchema({ users }),
  }),
})

const athena = createTypedClient(registry, process.env.ATHENA_URL!, process.env.ATHENA_API_KEY!)
```

Compatibility style:

```ts
import { defineDatabase, defineModel, defineRegistry, defineSchema } from "@xylex-group/athena"

const users = defineModel<{
  id: string
  email: string
  created_at: string | null
}>({
  meta: {
    primaryKey: ["id"],
    nullable: {
      id: false,
      email: false,
      created_at: true,
    },
  },
})

const registry = defineRegistry({
  app: defineDatabase({
    public: defineSchema({ users }),
  }),
})
```

Prefer `.schema("public")` plus `.from("actual_table_name")` only when the
logical model key and DB table name diverge.

## Typed client and `fromModel`

Canonical typed client:

```ts
const typed = createTypedClient(registry, process.env.ATHENA_URL!, process.env.ATHENA_API_KEY!, {
  tenantKeyMap: {
    organizationId: "X-Organization-Id",
  },
})
```

Canonical `fromModel(...)`:

```ts
await typed
  .withTenantContext({ organizationId: "org_1" })
  .fromModel("app", "public", "users")
  .findMany({
    select: {
      id: true,
      email: true,
    },
    limit: 20,
  })
```

Non-obvious runtime rules:

- `fromModel(...)` validates the database, schema, and model path before making HTTP calls
- the root client can also accept a model or table value directly through `from(modelValue)`
- a generic type argument alone cannot pick a runtime table after compilation

## Consumer repo rules

When generated `athena/models/*` contracts already exist:

- derive from those row, insert, and update types first
- avoid wrapper types that restate the same payload shape
- prefer one canonical model contract per table

If the user is trying to reduce a huge generated surface:

- change generator filters or output config instead of creating a second runtime registry
- keep `athena/models/*` as the stable consumer contract surface

## Form helpers

Prefer the built-in model-form helpers:

```ts
import { createModelFormAdapter } from "@xylex-group/athena"

const formAdapter = createModelFormAdapter(users)

const defaults = formAdapter.toDefaults(existingRow)
const insertPayload = formAdapter.toInsert(formValues)
const updatePayload = formAdapter.toUpdate(formValues)
```

Use:

- `createModelFormAdapter`
- `toModelFormDefaults`
- `toModelPayload`

before inventing repo-local empty-string or nullable-field adapters.

## Validation

- schema authoring and inference: schema and table-builder tests
- typed-client routing: typed-client tests
- repo-wide type surface: `pnpm typecheck`
- repo-wide final gate: `pnpm check:all`

