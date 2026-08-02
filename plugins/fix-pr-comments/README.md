# Fix PR Comments

Plugin packaging **Fix PR Comments** agent skills for Grok Build and Codex / ChatGPT.

Default icon: `assets/xbp.png`. Skills: **5**.

```bash
bun run process:raw-skills -- --plugin fix-pr-comments
```

## Skills

- `create-test-for-pr-comment`
- `fix-pr-comments`
- `fix-pr-comments-xbp`
- `fix-pr-comments-xbp-v2`
- `gh-address-comments`

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `assets/xbp.png` | Standard plugin icon |
| `skills/` | Bundled skills |

## License

MIT — see repository root `LICENSE`.
