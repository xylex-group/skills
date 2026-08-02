# Architecture

Plugin packaging **Architecture** agent skills for Grok Build and Codex / ChatGPT.

Default icon: `assets/xbp.png`. Skills: **4**.

```bash
bun run process:raw-skills -- --plugin architecture-plugins
```

## Skills

- `architecture-patterns`
- `codebase-design`
- `domain-modeling`
- `improve-codebase-architecture`

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `assets/xbp.png` | Standard plugin icon |
| `skills/` | Bundled skills |

## License

MIT — see repository root `LICENSE`.
