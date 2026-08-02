# Audit Code Quality

Plugin packaging **Audit Code Quality** agent skills for Grok Build and Codex / ChatGPT.

Default icon: `assets/xbp.png`. Skills: **7**.

```bash
bun run process:raw-skills -- --plugin audit-code-quality
```

## Skills

- `audit-and-shrink`
- `audit-duplicate-dead-code`
- `duplicate-blastzone-audit`
- `fallow`
- `frontend-code-hygiene`
- `reduce-contract-drift`
- `repo-audit-reporting`

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `assets/xbp.png` | Standard plugin icon |
| `skills/` | Bundled skills |

## License

MIT — see repository root `LICENSE`.
