# Frontend Rules

## Structure and Imports

- Avoid barrel files. They slow module resolution, enlarge the import graph, and encourage unused imports.
- Avoid long relative traversals such as `../../../` when the repo already supports aliases like `@/`.
- Keep names in `owner_trait` order such as `user_settings`, `user_preferences`, or `user_profile`.
- Do not switch casually between singular and plural naming for the same concept.

## JSX and Component Rules

- Do not nest ternary expressions in JSX. Use local variables, guard clauses, or helper functions instead.
- Do not use the array index as a React key when the list can reorder or mutate. Prefer a stable id from the data model.
- Prefer `lucide-react` or `gravity-icons` instead of raw inline `<svg>` elements. Only keep a raw SVG when the icon library cannot express the required asset.
- Avoid `forwardRef`. Prefer modern ref patterns that fit the current React version and the surrounding codebase.
- In `"use client"` entry files, keep props serializable. If a function prop is a server action, give it an `Action` suffix such as `onOpenChangeAction`.
- Do not leave open no-op blocks in context defaults or config objects when they hide an incomplete API design.
- Do not use `void` to discard async work in event handlers. Await it, return it, or handle the promise explicitly.

## Hook and Type Rules

- If a helper function causes hook dependency churn, wrap it in `useCallback` or move it outside the component.
- Ensure iterable callbacks such as `reduce()` return a value on every path.
- Prefer `T[]` over `Array<T>`.

## Styling Rules

- Do not hardcode Tailwind color classes when the codebase uses CSS color tokens or theme keys.
- Do not add `dark:` variants when the styling system already derives dark mode from shared tokens.

## Build New Components Mock-First

1. Create a realistic mock object or array with the exact intended shape.
2. Build the component against that shape first.
3. Add helpers, Athena calls, or data plumbing only after the UI contract is stable.

Use realistic seed data rather than tiny placeholder fragments. A good mock shape usually includes nested objects, status values, and a short activity list so empty states, edge cases, and spacing issues are visible early.

```ts
const demoCustomer: CustomerDemoData = {
  id: "cus_9kL3mPqR7vX2",
  name: "Alex Rivera",
  status: "active",
  billingAddress: {
    city: "San Francisco",
    country: "United States",
  },
  recentActivity: [
    {
      id: "act_1",
      action: "Updated billing address",
      description: "Changed postal code and added suite number",
    },
  ],
}
```

## Refactor Patterns

Replace nested ternaries like this:

```tsx
const content = children ?? (details ? renderDetails(details, data) : null)

return hasContent ? <div className="space-y-0.5">{content}</div> : null
```

Stabilize hook dependencies like this:

```ts
const getFontSizeSliderValue = useCallback((size: string) => {
  const index = FONT_SIZE_OPTIONS.findIndex((option) => option.value === size)
  return index >= 0 ? index : 1
}, [])
```

## Review Checklist

- No barrel files added
- No deep relative imports where an alias exists
- No nested ternaries
- No raw SVG unless required
- No array index keys
- No stray `void`
- No placeholder no-op context members
- Hook helper stability issues resolved
- Iterable callbacks always return
- Array types use `T[]`
- Tailwind colors come from tokens, not hardcoded palette utilities
- New components start from a realistic mock shape
