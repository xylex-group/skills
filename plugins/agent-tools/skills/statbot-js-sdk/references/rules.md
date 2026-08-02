# Statbot JS SDK Rules

## File Map

- `scripts/openapi/route-metadata.mjs`: route summaries and descriptions that drive the generated contract
- `scripts/openapi/*.mjs`: schema, path, and operation assembly
- `scripts/generate-openapi.mjs`: writes `openapi/openapi.json` and `openapi/openapi.yaml`
- `src/generated/openapi-types.ts`: generated from `openapi/openapi.json`; never hand-edit
- `src/client.ts`: public SDK methods and request wiring
- `src/validation.ts`: Zod schemas for IDs, query objects, and cross-field constraints
- `src/query-types.ts`: public query types derived from Zod schemas
- `src/errors.ts`: runtime error surface, including validation failures
- `examples/routes/*.ts`: one typed example file per `operationId`
- `examples/all-routes.ts`: aggregate module that re-exports or runs all route examples
- `test/openapi.test.ts`: OpenAPI parity, artifact, and example-coverage checks
- `test/client.test.ts`: client and validation smoke tests

## Route And Contract Workflow

1. Change the route metadata or generator inputs first.
2. Regenerate the contract with `npm run openapi:generate`.
3. Regenerate SDK contract types with `npm run sdk:generate` or `npm run generate`.
4. Update `src/client.ts` if method names, params, or responses changed.
5. Update `src/validation.ts` and `src/query-types.ts` if new query fields or path params were introduced.
6. Update docs and examples only after the contract and client are correct.

Do not leave temporary route markdown capture files in `openapi/`. The final repo state should keep only `openapi.json` and `openapi.yaml` there.

## Validation Rules

- Validate Discord IDs as numeric snowflake strings with 17 to 20 digits.
- Keep route-specific Zod schemas in `src/validation.ts` and derive exported public types from those schemas.
- Fail early on cross-field conflicts such as:
  - `limit` combined with `page_size`, `page`, or `select`
  - whitelist and blacklist filters for the same dimension
  - `page_size` without `page`, or `page` without `page_size`
  - `start` greater than `end`
  - invite flag mask without invite flag type, or the inverse
- Export reusable schemas and validation errors from the package surface when they are useful to callers.

## Example Rules

- Keep one file per route under `examples/routes/`.
- Name each file from the `operationId` converted to kebab-case, for example `getTopVoiceMembers` -> `get-top-voice-members.ts`.
- Keep shared placeholder IDs and client construction in `examples/shared.ts`.
- Keep `examples/all-routes.ts` as the aggregate entrypoint, not the primary place for route-specific snippets.
- When a route is added or renamed, update the example files and the example-coverage assertion in `test/openapi.test.ts` will catch drift.

## Verification

Run these commands after substantial changes:

```powershell
npm run typecheck
npm test
npm run build
```

For publish-facing changes, also run:

```powershell
npm pack --dry-run
```

Expected invariants:

- `npm run generate` rewrites the root OpenAPI artifacts and `src/generated/openapi-types.ts`
- `test/openapi.test.ts` passes for:
  - JSON/YAML parity
  - Swagger Parser validation
  - one example file per operation
  - `StatbotClient` method alignment with `operationId`s
- the repo remains publishable through `prepack`

## Release And Publish Flow

- Keep `.xbp/xbp.yaml` aligned with the package
- If the user asks for release follow-through, use the existing npm and `xbp` workflow rather than inventing a second path
- Typical commands are:

```powershell
xbp init
xbp version patch
xbp publish
```
