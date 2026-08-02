# Engineering

Plugin packaging **Engineering** agent skills for Grok Build and Codex / ChatGPT.

Default icon: `assets/xbp.png`. Skills: **6**.

```bash
bun run process:raw-skills -- --plugin engineering
```

## Skills

- `check-work`
- `code-review`
- `document-code-contracts`
- `spec-driven-development`
- `tdd`
- `test-driven-development`

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `assets/xbp.png` | Standard plugin icon |
| `skills/` | Bundled skills |

## License

MIT — see repository root `LICENSE`.
