# HeroUI v3 Composition Reference

**Category:** react  
**URL:** https://heroui.com/en/docs/react/getting-started/composition  
**Source MDX:** https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/getting-started/(handbook)/composition.mdx

Build flexible UI with component composition patterns. Change the rendered element, compose components together, and maintain full control over markup.

---

## Framework-agnostic styles

Variant functions live in `@heroui/styles` and can be used without React. Vue, Svelte, and others can share the design system:

```tsx
import { buttonVariants } from "@heroui/styles";
// Or re-export from React package (same functions):
import { buttonVariants } from "@heroui/react";
```

Use `@heroui/styles` for non-React frameworks or to avoid React dependencies.

---

## Polymorphic styling

Apply HeroUI styles to any element via variant functions or BEM. Works with framework components, native HTML, and custom components.

### Style a Link as a Button

```tsx
import { buttonVariants } from "@heroui/styles";
import Link from "next/link";

<Link className={buttonVariants({ variant: "primary" })} href="/about">
  About
</Link>

<a
  className={buttonVariants({ variant: "secondary", size: "lg" })}
  href="https://example.com"
>
  External Link
</a>
```

### BEM classes directly

```tsx
import Link from "next/link";

<Link className="button button--primary" href="/about">
  About
</Link>
```

### Custom root + compound children

When using a custom root instead of HeroUI's Root, children cannot access context slots. Pass `className` manually:

```tsx
import { Link } from "@heroui/react";
import { linkVariants } from "@heroui/styles";
import NextLink from "next/link";

const slots = linkVariants();

<NextLink className={slots.base()} href="/about">
  About Page
  <Link.Icon className={slots.icon()} />
</NextLink>

<NextLink className="link" href="/about">
  About Page
  <Link.Icon className="link__icon" />
</NextLink>
```

---

## Direct class application (BEM)

Simplest path; works with any framework or vanilla HTML. Best when you only need visuals (not `onPress` / interactive behavior).

```tsx
import Link from "next/link";

<Link className="button button--tertiary" href="/">
  Return Home
</Link>

<a className="button button--primary" href="/dashboard">
  Go to Dashboard
</a>
```

**Available button classes:**

| Class | Role |
|-------|------|
| `.button` | Base |
| `.button--primary` / `--secondary` / `--tertiary` / `--danger` / `--ghost` | Variants |
| `.button--sm` / `--md` / `--lg` | Sizes |
| `.button--icon-only` | Icon-only |

---

## Using variant functions

Type-safe styling for framework-specific or custom elements. Each component exports a variant function from `@heroui/styles` (`buttonVariants`, `chipVariants`, `linkVariants`, `spinnerVariants`, and more).

```tsx
import { Link } from "@heroui/react";
import { linkVariants } from "@heroui/styles";
import NextLink from "next/link";

const slots = linkVariants();

<NextLink className={slots.base()} href="/about">
  About Page
  <Link.Icon className={slots.icon()} />
</NextLink>
```

```tsx
import { buttonVariants } from "@heroui/styles";
import Link from "next/link";

<Link
  className={buttonVariants({ variant: "primary", size: "md" })}
  href="/dashboard"
>
  Dashboard
</Link>
```

---

## Compound components

HeroUI exports multiple parts that work together.

### Option 1: Compound (recommended) — no `.Root`

```tsx
import { Alert } from "@heroui/react";

<Alert>
  <Alert.Icon />
  <Alert.Content>
    <Alert.Title>Success</Alert.Title>
    <Alert.Description>Your changes have been saved.</Alert.Description>
  </Alert.Content>
  <Alert.Close />
</Alert>
```

### Option 2: Explicit `.Root`

```tsx
import { Alert } from "@heroui/react";

<Alert.Root>
  <Alert.Icon />
  <Alert.Content>
    <Alert.Title>Success</Alert.Title>
    <Alert.Description>Your changes have been saved.</Alert.Description>
  </Alert.Content>
  <Alert.Close />
</Alert.Root>
```

### Option 3: Named exports

```tsx
import {
  AlertRoot,
  AlertIcon,
  AlertContent,
  AlertTitle,
  AlertDescription,
  AlertClose,
} from "@heroui/react";

<AlertRoot>
  <AlertIcon />
  <AlertContent>
    <AlertTitle>Success</AlertTitle>
    <AlertDescription>Your changes have been saved.</AlertDescription>
  </AlertContent>
  <AlertClose />
</AlertRoot>
```

### Mixed syntax

```tsx
import { Alert, AlertTitle, AlertDescription } from "@heroui/react";

<Alert>
  <Alert.Icon />
  <Alert.Content>
    <AlertTitle>Success</AlertTitle>
    <AlertDescription>Your changes have been saved.</AlertDescription>
  </Alert.Content>
  <Alert.Close />
</Alert>
```

### Simple components (Button)

```tsx
import { Button } from "@heroui/react";

<Button>Click me</Button>
<Button.Root>Click me</Button.Root>

import { ButtonRoot } from "@heroui/react";
<ButtonRoot>Click me</ButtonRoot>
```

---

## Mixing variant functions

```tsx
import { Link } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";

const buttonStyles = buttonVariants({ variant: "tertiary", size: "md" });

<Link className={buttonStyles} href="https://heroui.com">
  HeroUI
</Link>
```

---

## Custom components

```tsx
import { Button, Tooltip } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";

function LinkButton({ href, children, variant = "primary", ...props }) {
  return (
    <a href={href} className={buttonVariants({ variant, ...props })} {...props}>
      {children}
    </a>
  );
}

function IconButton({ icon, label, ...props }) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button isIconOnly {...props}>
          <Icon icon={icon} />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}
```

---

## Custom variants

Extend a component's variant function with `tv`:

```tsx
import type { ButtonRootProps } from "@heroui/react";
import type { VariantProps } from "tailwind-variants";

import { Button } from "@heroui/react";
import { buttonVariants, tv } from "@heroui/styles";

const myButtonVariants = tv({
  extend: buttonVariants,
  base: "text-md text-shadow-lg font-semibold shadow-md data-[pending=true]:opacity-40",
  variants: {
    radius: {
      lg: "rounded-lg",
      md: "rounded-md",
      sm: "rounded-sm",
      full: "rounded-full",
    },
    size: {
      sm: "h-10 px-4",
      md: "h-11 px-6",
      lg: "h-12 px-8",
      xl: "h-13 px-10",
    },
    variant: {
      primary:
        "text-white dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
    },
  },
  defaultVariants: {
    radius: "full",
    variant: "primary",
  },
});

type MyButtonVariants = VariantProps<typeof myButtonVariants>;
export type MyButtonProps = Omit<ButtonRootProps, "className"> &
  MyButtonVariants & { className?: string };

function CustomButton({ className, radius, variant, ...props }: MyButtonProps) {
  return (
    <Button
      className={myButtonVariants({ className, radius, variant })}
      {...props}
    />
  );
}
```

### Type references

**Recommended — named type imports:**

```tsx
import type { ButtonRootProps, AvatarRootProps } from "@heroui/react";

type MyButtonProps = ButtonRootProps;
type MyAvatarProps = AvatarRootProps;
```

**Alternative — object-style syntax:**

```tsx
import { Button, Avatar } from "@heroui/react";

type MyButtonProps = Button["RootProps"];
type MyAvatarProps = Avatar["RootProps"];
```

**Note:** Namespace syntax `Button.RootProps` is **no longer supported**. Use `Button["RootProps"]` or named imports.

---

## Custom DOM element (`render` prop)

Use `render` on supported components to replace the default DOM element while preserving behavior.

### Motion

```tsx
import { Button } from "@heroui/react";
import { motion } from "motion/react";

<Button
  render={(domProps, { isPressed }) => (
    <motion.button {...domProps} animate={{ scale: isPressed ? 0.9 : 1 }} />
  )}
>
  Press me
</Button>
```

### Client-side router link

```tsx
import { Link } from "@heroui/react";
import NextLink from "next/link";

<Link
  render={({ ref, ...domProps }) => (
    <NextLink
      {...domProps}
      ref={ref as React.Ref<HTMLAnchorElement>}
      href="/privacy-policy"
    />
  )}
>
  Privacy Policy
</Link>
```

### Rules (a11y / behavior)

1. Always render the **expected element type** (e.g. if `<button>` is expected, do not render an `<a>`). Dev mode warns on mismatch.
2. Only a **single root DOM element** (no fragments).
3. Always pass provided props to the underlying DOM element; merge with your own props via `mergeProps` as needed.

---

## Framework integration

### Next.js

Variant functions:

```tsx
import { buttonVariants } from "@heroui/styles";
import Link from "next/link";

<Link className={buttonVariants({ variant: "primary" })} href="/dashboard">
  Dashboard
</Link>
```

BEM:

```tsx
import Link from "next/link";

<Link className="button button--primary" href="/dashboard">
  Dashboard
</Link>
```

### React Router

```tsx
import { buttonVariants } from "@heroui/styles";
import { Link } from "react-router-dom";

<Link className={buttonVariants({ variant: "primary" })} to="/dashboard">
  Dashboard
</Link>

// Or BEM:
// <Link className="button button--primary" to="/dashboard">…</Link>
```

### Vue (or Svelte / other)

`@heroui/styles` has no React dependency:

```vue
<script setup>
import { buttonVariants } from "@heroui/styles";

const primaryButton = buttonVariants({ variant: "primary" });
</script>

<template>
  <button :class="primaryButton">Click me</button>
</template>
```

---

## Next steps

- [Styling](https://heroui.com/docs/handbook/styling)
- [Animation](https://heroui.com/docs/handbook/animation)
- [Components](https://heroui.com/docs/react/components)
- Design principles: skill `heroui-design-principles`
- Frameworks: skill `heroui-frameworks`
