# HeroUI v3 Framework Integration

**Category:** react  
**URL:** https://heroui.com/en/docs/react/getting-started/frameworks  
**Source MDX:** https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/getting-started/(overview)/frameworks.mdx

Integrate HeroUI with your framework.

---

## Next.js

### 1. Create a Next.js project

```bash
npx heroui-cli@latest init
```

When prompted, select the **App** or **Pages** template. Then open your new folder and install dependencies (for example `pnpm install`).

### 2. Use your first HeroUI component

#### App Router

Example: `app/page.tsx`

```tsx
import { Button } from "@heroui/react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button variant="tertiary">Hello HeroUI</Button>
    </main>
  );
}
```

#### Pages Router

Example: `pages/index.tsx`

```tsx
import { Button } from "@heroui/react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button variant="tertiary">Hello HeroUI</Button>
    </main>
  );
}
```

**Note:** HeroUI v3 does not require a provider. Components work directly after installation and style import.

### 3. Locale setup (optional)

To integrate with Next.js, ensure the locale on the server matches the client.

In your root layout, determine the user's preferred language and set the `lang` and `dir` attributes on the `<html>` element.

```tsx
// app/layout.tsx
import { headers } from "next/headers";
import { isRTL } from "@heroui/react";
import { ClientProviders } from "./provider";

export default async function RootLayout({ children }) {
  // Get the user's preferred language from the Accept-Language header.
  // You could also get this from a database, URL param, etc.
  const acceptLanguage = (await headers()).get("accept-language");
  const lang = acceptLanguage?.split(/[,;]/)[0] || "en-US";

  return (
    <html lang={lang} dir={isRTL(lang) ? "rtl" : "ltr"}>
      <body>
        <ClientProviders lang={lang}>{children}</ClientProviders>
      </body>
    </html>
  );
}
```

Create `app/provider.tsx`. This should render an `I18nProvider` to set the locale used by React Aria.

```tsx
// app/provider.tsx
"use client";

import { I18nProvider } from "@heroui/react";

export function ClientProviders({ lang, children }) {
  return <I18nProvider locale={lang}>{children}</I18nProvider>;
}
```

### CSP nonce (optional)

If you are using a [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (CSP) with a nonce, add a `<meta property="csp-nonce">` tag to your document head, setting the `content` attribute to the generated nonce value. React Aria automatically reads the nonce from this tag.

```html
<meta property="csp-nonce" content="{your-generated-nonce}" />
```

---

## Vite

### 1. Create a Vite project

```bash
npx heroui-cli@latest init
```

When prompted, select the **Vite** template. Then open your new folder and install dependencies (for example `pnpm install`).

### 2. Use your first HeroUI component

Example: `src/App.tsx`

```tsx
import { Button } from "@heroui/react";

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button variant="tertiary">Hello HeroUI</Button>
    </main>
  );
}

export default App;
```

**Note:** HeroUI v3 does not require a provider. Components work directly after installation and style import.

---

## Next steps

- [Quick Start](https://heroui.com/docs/react/getting-started/quick-start) — fastest setup path
- [Themes](https://heroui.com/docs/react/getting-started/theming) — customize colors and tokens
- [Components](https://heroui.com/docs/react/components) — explore all available components
- Design principles skill: `heroui-design-principles`
- Component install/docs skill: `heroui-react`
