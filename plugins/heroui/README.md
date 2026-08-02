# HeroUI plugin

Plugin packaging **HeroUI v3** agent skills (React, Native, theming, styling,
composition, frameworks, CLI, migration) for Grok Build and Codex / ChatGPT.

Every skill id is **`heroui-*` prefixed**. Skills are staged from
`raw-skills/heroui/` (gitignored) and processed with:

```bash
bun run process:raw-skills -- --plugin heroui
```

## Skills

| Skill | Focus |
| --- | --- |
| `heroui-react` | Core React library, install, compound components |
| `heroui-native` | React Native (Uniwind / Tailwind v4) |
| `heroui-all-components` | Full component catalog |
| `heroui-styling` | className, BEM, render props, Tailwind |
| `heroui-colors` | Semantic color roles and CSS variables |
| `heroui-dark-mode` | Light / dark / system themes |
| `heroui-composition-patterns` | Compound components, variants, polymorphism |
| `heroui-design-principles` | HeroUI v3 design principles |
| `heroui-animation-and-transitions` | CSS transitions and motion |
| `heroui-frameworks` | Next.js and Vite integration |
| `heroui-cli` | `heroui-cli` init / doctor / packages |
| `heroui-migration` | v2 → v3 migration |

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest (`skills: ./skills/`) |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `skills/` | Bundled `heroui-*` skills |

## Install

- **Grok:** XYLEX Group marketplace (`xylex-group/skills`) as plugin `heroui`
- **Codex / ChatGPT:** repo marketplace `.agents/plugins/marketplace.json` entry `heroui` → `./plugins/heroui`

## Source / refresh

```powershell
# re-stage from local Grok library, then process
New-Item -ItemType Directory -Force raw-skills/heroui | Out-Null
Get-ChildItem "$env:USERPROFILE\.grok\skills" -Directory |
  Where-Object { $_.Name -like 'heroui-*' } |
  ForEach-Object { Copy-Item -Recurse -Force $_.FullName "raw-skills\heroui\$($_.Name)" }
bun run process:raw-skills -- --plugin heroui
```

## License

MIT — see repository root `LICENSE`. Upstream HeroUI skill content may also ship
per-skill `LICENSE.txt` from the HeroUI project.
