# UI Polish Rules

## Quick Start

1. Name the component states before writing CSS or animation code.
2. Define or reuse tokens for easing, duration, radius, color, and shadows.
3. Tune feel first: easing, entrance shape, drag response, snap behavior, press feedback.
4. Add depth and micro-interactions only after the motion system feels coherent.
5. Honor reduced motion and keep expensive effects scoped to small, deliberate moments.

## Default Motion Tokens

Use one house motion set and reuse it consistently.

```css
:root {
  --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out: cubic-bezier(0.17, 1, 0.32, 1);
  --ease-spring: cubic-bezier(0.35, 1.55, 0.65, 1);
  --ease-in-out: cubic-bezier(0.66, 0, 0.34, 1);

  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 280ms;

  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 24px;
}
```

Rules:

- Do not use browser-default `ease` or `ease-in-out` when the project supports custom motion tokens.
- Use `--ease-smooth` for most transitions.
- Use `--ease-out` for decorative entrances.
- Use `--ease-spring` for pops, badges, and overshoot moments.
- Keep numbers centralized so the UI does not drift into random radii or timings.

## State-Driven Design

A polished component is a state machine, not a screenshot.

Common state groups:

- Surface state: idle, hover, pressed, focused, disabled.
- Async state: loading, success, error, empty.
- Spatial state: collapsed, expanded, entering, exiting, dragging, snapped.
- Media state: playing, paused, buffering, muted.

Implementation rules:

- List the states before building the component.
- If a state feels missing during implementation, add it instead of forcing one visual treatment to do every job.
- Prefer behavior discovered during use over static mockup assumptions.

Micro-interaction examples:

- Roll numbers digit-by-digit instead of hard swapping.
- Let a working label shimmer softly instead of always dropping in a spinner.
- Cross-fade and scale icons between play and pause instead of replacing them abruptly.

## Entrances and Reveals

Avoid plain fades for primary entrances.

Standard entrance recipe:

- `opacity: 0 -> 1`
- `transform: translateY(6px) -> translateY(0)`
- `filter: blur(2px) -> blur(0)`
- duration around `280ms` to `320ms`
- easing `var(--ease-smooth)`

Prompt template:

> Use a premium entrance: fade in, rise 6px, and clear a 2px blur over about 300ms on the smooth curve.

For expand or collapse, do not use a fake `max-height` hack.

```css
.reveal {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 220ms var(--ease-smooth);
}

.reveal[data-open="true"] {
  grid-template-rows: 1fr;
}

.reveal > * {
  overflow: hidden;
}
```

Use FLIP when an element visibly moves between containers.

## Shadows and Depth

One flat drop shadow reads as generic. Use layered light instead.

Card shadow:

```css
--shadow-card:
  0 1px 2px rgba(0, 0, 0, 0.05),
  0 2px 4px rgba(0, 0, 0, 0.02),
  0 0 0 0.5px rgba(0, 0, 0, 0.08);
```

Elevated shadow:

```css
--shadow-elevated:
  0 4px 8px rgba(0, 0, 0, 0.02),
  0 8px 12px rgba(0, 0, 0, 0.02),
  0 2px 4px rgba(0, 0, 0, 0.02),
  0 1px 2px rgba(0, 0, 0, 0.04),
  0 0 0 0.5px #e0e0e0;
```

Depth rules:

- Replace obvious borders with a subtle hairline ring when appropriate.
- Keep shadow opacity low, roughly 2% to 8%.
- Combine a contact shadow and a wider ambient shadow instead of one heavy blur.
- Animate the whole stack carefully on hover instead of only changing one blur value.

## Tactility

Every interactive surface should acknowledge input.

```css
.button:active {
  transform: scale(0.98);
}
```

Rules:

- Use `scale(0.98)` as the default press response unless the component needs a different behavior.
- Pair press feedback with hover changes that still feel calm.
- Let tooltips or popovers fade, lift slightly, and clear a light blur instead of appearing instantly.

Tooltip prompt template:

> Tooltips should fade in, lift about 4px, and clear a 2px blur. They should never pop in instantly.

## Drag Physics and Snap Points

For draggable controls, timed slides are not enough.

Drag feel rules:

- Track recent velocity so a fast flick has visible momentum.
- On release, glide and decelerate instead of stopping immediately.
- Add soft bounds so edges stretch slightly and spring back.
- Use spring-based values for counters or other continuous readings that should feel physical.

Snap rules:

- Add snap points for meaningful values such as month boundaries, presets, or labeled stops.
- Use a smaller pull-in zone to capture the handle.
- Use a larger release zone so it resists accidental escape once snapped.
- Flash or pulse the active label when the snap catches.

Prompt template:

> Make the slider feel like a physical object. A flick should coast and slow down naturally, the edges should stretch slightly and spring back, and meaningful values should magnetically snap with a stronger release zone than pull-in zone.

## Prompting Rules

Prefer these habits:

- Give numbers, not adjectives.
- Paste the token block before asking for implementation.
- Name every state you expect.
- Iterate on one variable at a time.
- Anchor subjective feel to a reference such as iOS sheets, a weighted card, or a magnetic slider.

Good prompt patterns:

- "Use `cubic-bezier(0.22, 1, 0.36, 1)` for standard transitions and `cubic-bezier(0.35, 1.55, 0.65, 1)` for pop-ins."
- "Use only these tokens. Do not introduce one-off values."
- "Implement idle, hover, pressed, loading, disabled, and success states."
- "Tune only the shadow stack in this pass."
- "Make it feel weighty and slightly springy, like an iOS sheet that settles quickly."

Weak prompt patterns:

- "Make it premium."
- "Make it smoother."
- "Add some polish."

## Figma Handoff Checklist

Treat a Figma file as a starting hypothesis, not the full implementation.

When a Figma selection exists:

1. Read off every visual property explicitly.
2. Name the properties in the prompt instead of trusting the bridge tool.
3. Mirror design tokens between Figma and code where possible.
4. Expect extra live states to emerge during implementation.

Properties to enumerate:

- padding
- gap
- radius
- colors
- border or hairline treatment
- typography sizes and weights
- shadow stack
- opacity
- blur
- layout constraints
- variants or named states

Prompt template:

> Match the current Figma selection exactly. Read and apply the padding, gaps, token names, colors, corner radius, typography sizes and weights, shadow treatment, and every visible state from the selection before adding new behavior.

## Performance and Accessibility

Polish is incomplete if motion ignores user preferences or harms frame rate.

Rules:

- Honor `prefers-reduced-motion` everywhere.
- Collapse decorative motion to instant or near-instant when reduced motion is enabled.
- Prefer transforms and opacity for large surfaces or long lists.
- Use blur, layered shadows, and layout-affecting animations sparingly and intentionally.

## Review Checklist

- States are explicit and complete.
- Motion tokens are reused consistently.
- No browser-default easing where the system expects tuned curves.
- Entrances use more than a plain fade when the surface is meant to feel premium.
- Shadows are layered and low-opacity.
- Interactive elements have tactile press feedback.
- Expand and collapse uses content-aware techniques.
- Dragging, snapping, and release behavior feel physical where relevant.
- Reduced motion is honored.
- Figma handoff properties were explicitly enumerated when applicable.
