# HeroUI v3 Dark Mode Reference

**Category:** react  
**URL:** https://heroui.com/en/docs/react/getting-started/dark-mode  
**Source MDX:** https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/getting-started/(handbook)/dark-mode.mdx

Add light, dark, and system theme switching to HeroUI v3.

HeroUI dark mode is **CSS-driven**. Components read theme variables from the root element — you do **not** need a HeroUI provider. Add the `dark` class or `data-theme="dark"` to `<html>` and HeroUI applies the dark theme.

```html
<html class="dark" data-theme="dark">
  <body class="bg-background text-foreground">
    <!-- Your app -->
  </body>
</html>
```

Keep `bg-background` and `text-foreground` on the app shell so the page canvas follows the active theme.

Built-in light and dark themes respond to both:

- Classes: `.light` / `.dark`
- Attributes: `data-theme="light"` / `data-theme="dark"`

If you set both manually, **keep the values in sync**.

---

## Next.js with next-themes

Use [next-themes](https://github.com/pacocoursey/next-themes) for theme persistence, system preference, and no flash before hydration.

### Install

```bash
npm i next-themes
# pnpm add next-themes
# yarn add next-themes
# bun add next-themes
```

### App Router — provider

```tsx
// app/providers.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

### App Router — layout

Add `suppressHydrationWarning` to `<html>` because next-themes updates that element before hydration.

```tsx
// app/layout.tsx
import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Theme switcher (next-themes)

Use `useTheme` from `next-themes` in a client component. Delay render until mount — the active theme is unknown during SSR.

```tsx
// app/components/theme-switcher.tsx
"use client";

import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme, theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={activeTheme === "light" ? "primary" : "secondary"}
        onPress={() => setTheme("light")}
      >
        Light
      </Button>
      <Button
        variant={activeTheme === "dark" ? "primary" : "secondary"}
        onPress={() => setTheme("dark")}
      >
        Dark
      </Button>
      <Button
        variant={theme === "system" ? "primary" : "secondary"}
        onPress={() => setTheme("system")}
      >
        System
      </Button>
    </div>
  );
}
```

### Pages Router

```tsx
// pages/_app.tsx
import "@/styles/globals.css";

import type { AppProps } from "next/app";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Component {...pageProps} />
    </NextThemesProvider>
  );
}
```

---

## Using custom theme names

`attribute="class"` works for built-in `light` and `dark`. If custom theme CSS uses `data-theme` selectors, configure next-themes to write `data-theme`:

```tsx
<NextThemesProvider
  attribute="data-theme"
  defaultTheme="system"
  enableSystem
  themes={["light", "dark", "ocean", "ocean-dark"]}
>
  {children}
</NextThemesProvider>
```

When you pass a custom `themes` list, include `"light"` and `"dark"` if you still want the built-in themes.

---

## React with useTheme (Vite / CRA / plain React)

Use HeroUI's `useTheme` when you do not need next-themes.

Exported from `@heroui/react`. It:

- Stores the selected theme in `localStorage`
- Resolves `"system"` from the OS preference
- Applies both the **class** and **`data-theme`** on `<html>`

```tsx
// src/components/theme-switcher.tsx
import { Button, useTheme } from "@heroui/react";

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme, theme } = useTheme("system");

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={resolvedTheme === "light" ? "primary" : "secondary"}
        onPress={() => setTheme("light")}
      >
        Light
      </Button>
      <Button
        variant={resolvedTheme === "dark" ? "primary" : "secondary"}
        onPress={() => setTheme("dark")}
      >
        Dark
      </Button>
      <Button
        variant={theme === "system" ? "primary" : "secondary"}
        onPress={() => setTheme("system")}
      >
        System
      </Button>
    </div>
  );
}
```

**Warning:** Use **one** theme controller per app.

- Next.js → prefer `next-themes` and its `useTheme`
- Plain React → use `useTheme` from `@heroui/react`

---

## Styling for both themes

Theme-aware utilities read CSS variables automatically:

```tsx
<main className="min-h-screen bg-background text-foreground">
  <section className="bg-surface text-surface-foreground shadow-surface">
    Theme-aware content
  </section>
</main>
```

Use the `dark:` variant for one-off dark-only tweaks:

```tsx
<div className="bg-background text-foreground dark:border-default">
  Custom dark-mode adjustment
</div>
```

---

## Related

- Theming (tokens, custom themes)
- Styling skill: `heroui-styling`
- Frameworks skill: `heroui-frameworks`
