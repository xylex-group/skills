# Agent Tools

Plugin packaging **Agent Tools** agent skills for Grok Build and Codex / ChatGPT.

Default icon: `assets/xbp.png`. Skills: **14**.

```bash
bun run process:raw-skills -- --plugin agent-tools
```

## Skills

- `create-skill`
- `global-error-registry`
- `hatch-pet`
- `help`
- `imagine`
- `linear`
- `nvim-config`
- `setup-docs-blume`
- `statbot-js-sdk`
- `tailwind-canonicalize`
- `triage-and-case-issues`
- `ultracite-setup`
- `update-skill`
- `vercel-data-security-guide`

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `assets/xbp.png` | Standard plugin icon |
| `skills/` | Bundled skills |

## License

MIT — see repository root `LICENSE`.
