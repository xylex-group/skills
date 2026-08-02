# UI Plugins

Plugin packaging **UI Plugins** agent skills for Grok Build and Codex / ChatGPT.

Default icon: `assets/xbp.png`. Skills: **9**.

```bash
bun run process:raw-skills -- --plugin ui-plugins
```

## Skills

- `agentation`
- `anti-ui-slop`
- `extract-design-system`
- `polish-ui-components`
- `transitions-dev`
- `transitions-polish`
- `ui-design`
- `ui-radar`
- `ui-slop-score`

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `assets/xbp.png` | Standard plugin icon |
| `skills/` | Bundled skills |

## License

MIT — see repository root `LICENSE`.
