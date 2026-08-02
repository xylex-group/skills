# Contract Template

Use this template unless the repository already has a stronger contract format.

````md
# createUser

## Summary
One sentence describing what the callable does for callers.

## Symbol
- Name: `createUser`
- Kind: `function`
- Owner: `UserService`

## Signature
```ts
createUser(input: CreateUserInput): Promise<User>
```

## Location
- `src/services/user-service.ts`

## Inputs
- `input`: `CreateUserInput`, required
  - `email`: `string`, required
  - `name`: `string | undefined`

## Returns
- Resolves to `User`
- Returns the created persisted user record

## Errors
- Throws `ValidationError` when `email` is invalid
- Throws `ConflictError` when the user already exists

## Preconditions
- Caller must be authenticated as an admin
- Database connection must be available

## Side Effects
- Inserts a row into `users`
- Emits `user.created`

## Guarantees
- Persists the user before emitting `user.created`
- Never returns a partially populated `User`

## Examples
```ts
await createUser({ email: "test@example.com", name: "Test" });
```

## Source of Truth
- Implementation: `src/services/user-service.ts`
- Tests: `tests/user-service.test.ts`
- Call sites: `src/routes/admin-users.ts`
````

## Naming Rules

- `create-user` -> `docs/contracts/createUser.md`
- `create_user` -> `docs/contracts/createUser.md`
- `CreateUser` -> `docs/contracts/createUser.md`
- `AuthService.create_user` -> `docs/contracts/createUser.md`
- Collision escape hatch: `createUserAdminService.md`

Use the callable name as the file basename. Only add an owner suffix when two different callables would otherwise map to the same file.
