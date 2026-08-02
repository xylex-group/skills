# HeroUI v3 Colors Reference

**Category:** react  
**URL:** https://heroui.com/en/docs/react/getting-started/colors  
**Source MDX:** https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/getting-started/(handbook)/colors.mdx  
**Default theme:** https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/default/variables.css  
**Theme Builder:** https://heroui.com/themes

HeroUI’s color system is built around **semantic intent**, not visual abundance. A small set of meaningful roles covers most UI needs. Many values are derived automatically from base tokens for consistent contrast, hierarchy, and theming.

Colors should communicate **purpose and state** first. Visual variation comes from scale, emphasis, and context.

---

## Accent

Primary brand / product identity. Key actions, highlights, emphasis. Use **intentionally and sparingly**.

| Token / derived | Typical formula / value (docs) |
|-----------------|--------------------------------|
| `--accent` | `oklch(0.6204 0.195 253.83)` |
| `--accent-foreground` | `var(--snow)` |
| Hover solid | `color-mix(in oklab, var(--accent) 90%, var(--accent-foreground) 10%)` |
| Soft | `color-mix(in oklab, var(--accent) 15%, transparent)` |
| Soft hover | `color-mix(in oklab, var(--accent) 20%, transparent)` |
| Soft foreground | `var(--accent)` |

---

## Default (neutrals)

Neutral backbone for non-emphasized UI.

| Token | Typical (docs) |
|-------|----------------|
| `--default` | `oklch(94% 0.001 286.375)` |
| `--default-foreground` | `var(--eclipse)` |
| Hover | mix default 96% + default-foreground 4% |

---

## Success

Positive outcomes, confirmations, validation.

| Token | Typical (docs) |
|-------|----------------|
| `--success` | `oklch(0.7329 0.1935 150.81)` |
| `--success-foreground` | `var(--eclipse)` |
| Soft / soft-hover | 15% / 20% success + transparent |
| Soft foreground | `var(--success)` |

---

## Warning

Caution, risk, non-destructive attention.

| Token | Typical (docs) |
|-------|----------------|
| `--warning` | `oklch(0.7819 0.1585 72.33)` |
| `--warning-foreground` | `var(--eclipse)` |
| Soft / soft-hover | 15% / 20% warning + transparent |

---

## Danger

Destructive, irreversible, critical errors — consistent and recognizable.

| Token | Typical (docs) |
|-------|----------------|
| `--danger` | `oklch(0.6532 0.2328 25.74)` |
| `--danger-foreground` | `var(--snow)` |
| Soft / soft-hover | 15% / 20% danger + transparent |

---

## Foreground

Primary content (text, icons). Optimized for readability. **Do not hard-code at component level.**

| Label | Variable | Light (docs) | Dark (docs) |
|-------|----------|--------------|-------------|
| Foreground | `--foreground` | `var(--eclipse)` | `var(--snow)` |
| Muted | `--muted` | `oklch(0.5517 0.0138 285.94)` | `oklch(70.5% 0.015 286.067)` |
| Segment | `--segment` | `var(--white)` | `oklch(0.3964 0.01 285.93)` |
| Overlay | `--overlay` | `var(--white)` | `oklch(0.2103 0.0059 285.89)` |
| Link | `--link` | `var(--foreground)` | `var(--foreground)` |

---

## Background

Base canvas — quiet contrast and mood.

| Label | Notes |
|-------|--------|
| Background | `--background` |
| Secondary / Tertiary | `color-mix` background with foreground (96%/4%, 92%/8%) |
| Inverse | `var(--foreground)` |

Light `--background`: `oklch(0.9702 0 0)`  
Dark `--background`: `oklch(12% 0.005 285.823)`

---

## Surface

Sits on backgrounds: cards, panels, modals-in-flow, dropdowns. Hierarchy via elevation/layering.

| Token | Light (docs) | Dark (docs) |
|-------|--------------|-------------|
| `--surface` | `var(--white)` | `oklch(0.2103 0.0059 285.89)` |
| `--surface-secondary` | `oklch(0.9524 0.0013 286.37)` | `oklch(0.257 0.0037 286.14)` |
| `--surface-tertiary` | `oklch(0.9373 0.0013 286.37)` | `oklch(0.2721 0.0024 247.91)` |

---

## Form field

Specialized for inputs/controls (default, hover, focus). Distinct from buttons.

| Token | Notes |
|-------|--------|
| `--field-background` | Light: white; dark: often `var(--default)` |
| `--field-foreground` | Field text |
| `--field-placeholder` | Often `var(--muted)` |
| `--field-border` | Often transparent by default |
| Field hover/focus | Derived mixes / field-background |

---

## Separator

Dividers, subtle boundaries — low contrast.

| Role | Notes |
|------|--------|
| `--separator` | Light ~92% oklch; dark ~25% |
| Secondary / Tertiary | Mix surface + surface-foreground (85/15, 81/19) |

---

## Other utility

| Token | Role |
|-------|------|
| `--border` | Borders |
| `--backdrop` | Modal scrim (light ~0.5 alpha black; dark ~0.6) |
| `--overlay` | Floating surfaces |
| `--segment` | Segmented controls |
| `--focus` | Focus ring (often `var(--accent)`) |
| `--link` | Links (often `var(--foreground)`) |

---

## Primitive (mode-agnostic)

Do **not** switch between light and dark themes.

| Token | Value (docs) |
|-------|----------------|
| `--white` | `oklch(100% 0 0)` |
| `--black` | `oklch(0% 0 0)` |
| `--snow` | `oklch(0.9911 0 0)` |
| `--eclipse` | `oklch(0.2103 0.0059 285.89)` |

---

## How to use colors

### In components

```jsx
<div className="bg-background text-foreground">
  <button className="bg-accent text-accent-foreground hover:bg-accent-hover">
    Click me
  </button>
</div>
```

### In CSS

```css
.my-component {
  background: var(--accent);
  color: var(--accent-foreground);
  border: 1px solid var(--border);
}

@layer components {
  .button {
    @apply bg-accent text-accent-foreground;

    &:hover,
    &[data-hovered="true"] {
      @apply bg-accent-hover;
    }

    &:active,
    &[data-pressed="true"] {
      @apply bg-accent-hover;
      transform: scale(0.97);
    }
  }
}
```

---

## Default theme (excerpt)

Switches on `class="dark"` or `data-theme="dark"`. Full definition in `packages/styles/themes/default/variables.css`.

```css
@layer base {
  :root {
    color-scheme: light;

    /* Primitive (stable across modes) */
    --white: oklch(100% 0 0);
    --black: oklch(0% 0 0);
    --snow: oklch(0.9911 0 0);
    --eclipse: oklch(0.2103 0.0059 285.89);

    --spacing: 0.25rem;
    --border-width: 1px;
    --field-border-width: 0px;
    --disabled-opacity: 0.5;
    --ring-offset-width: 2px;
    --cursor-interactive: pointer;
    --cursor-disabled: not-allowed;
    --radius: 0.5rem;
    --field-radius: calc(var(--radius) * 1.5);

    /* Light */
    --background: oklch(0.9702 0 0);
    --foreground: var(--eclipse);

    --surface: var(--white);
    --surface-foreground: var(--foreground);

    --overlay: var(--white);
    --overlay-foreground: var(--foreground);

    --muted: oklch(0.5517 0.0138 285.94);
    --scrollbar: oklch(87.1% 0.006 286.286);

    --default: oklch(94% 0.001 286.375);
    --default-foreground: var(--eclipse);

    --accent: oklch(0.6204 0.195 253.83);
    --accent-foreground: var(--snow);

    --field-background: var(--white);
    --field-foreground: oklch(0.2103 0.0059 285.89);
    --field-placeholder: var(--muted);
    --field-border: transparent;

    --success: oklch(0.7329 0.1935 150.81);
    --success-foreground: var(--eclipse);
    --warning: oklch(0.7819 0.1585 72.33);
    --warning-foreground: var(--eclipse);
    --danger: oklch(0.6532 0.2328 25.74);
    --danger-foreground: var(--snow);

    --segment: var(--white);
    --segment-foreground: var(--eclipse);

    --border: oklch(92% 0.004 286.32);
    --separator: oklch(92% 0.004 286.32);
    --focus: var(--accent);
    --link: var(--foreground);
    --backdrop: rgba(0, 0, 0, 0.5);

    --surface-shadow:
      0 2px 4px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.06),
      0 0 1px 0 rgba(0, 0, 0, 0.06);
    --overlay-shadow: 0 4px 16px 0 rgba(24, 24, 27, 0.08), 0 8px 24px 0 rgba(24, 24, 27, 0.09);
    --field-shadow:
      0 2px 4px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.06),
      0 0 1px 0 rgba(0, 0, 0, 0.06);
    --skeleton-animation: shimmer;
    --tooltip-delay: 1500ms;
    --tooltip-close-delay: 500ms;
  }

  .dark,
  [data-theme="dark"] {
    color-scheme: dark;

    --background: oklch(12% 0.005 285.823);
    --foreground: var(--snow);

    --surface: oklch(0.2103 0.0059 285.89);
    --surface-foreground: var(--foreground);

    --overlay: oklch(0.22 0.0059 285.89);
    --overlay-foreground: var(--foreground);

    --muted: oklch(70.5% 0.015 286.067);
    --scrollbar: oklch(70.5% 0.015 286.067);

    --default: oklch(27.4% 0.006 286.033);
    --default-foreground: var(--snow);

    --field-background: var(--default);
    --field-foreground: var(--foreground);

    --warning: oklch(0.8203 0.1388 76.34);
    --warning-foreground: var(--eclipse);
    --danger: oklch(0.594 0.1967 24.63);
    --danger-foreground: var(--snow);

    --segment: oklch(0.3964 0.01 285.93);
    --segment-foreground: var(--foreground);

    --border: oklch(22% 0.006 286.033);
    --separator: oklch(22% 0.006 286.033);
    --focus: var(--accent);
    --link: var(--foreground);
    --backdrop: rgba(0, 0, 0, 0.6);

    --surface-shadow: 0 0 0 0 transparent inset;
    --overlay-shadow: 0 0 0 0 transparent inset;
    --field-shadow: 0 0 0 0 transparent inset;
  }
}
```

---

## Customizing colors

### Override existing

```css
:root {
  --accent: oklch(0.7 0.15 250);
  --success: oklch(0.65 0.15 155);
}

[data-theme="dark"] {
  --accent: oklch(0.8 0.12 250);
  --success: oklch(0.75 0.12 155);
}
```

Convert colors at [oklch.com](https://oklch.com).

### Add custom colors + Tailwind v4

```css
:root,
[data-theme="light"] {
  --info: oklch(0.6 0.15 210);
  --info-foreground: oklch(0.98 0 0);
}

.dark,
[data-theme="dark"] {
  --info: oklch(0.7 0.12 210);
  --info-foreground: oklch(0.15 0 0);
}

@theme inline {
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
}
```

```tsx
<div className="bg-info text-info-foreground">Info message</div>
```

See [Tailwind CSS Theme](https://tailwindcss.com/docs/theme) for theme variables in v4.

---

## Related skills

- `heroui-dark-mode` — light/dark/system switching
- `heroui-styling` — className, BEM, wrappers
- `heroui-design-principles` — semantic UI intent
- `heroui-react` — install and components
