# Github plugin

Plugin packaging Github agent skills for Grok Build and Codex / ChatGPT.

Skills are staged under `raw-skills/github/` and processed with
`pnpm run process:raw-skills`.

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest (`skills: ./skills/`) |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `skills/` | Bundled skills |

## Install

- **Grok:** XYLEX Group marketplace (`xylex-group/skills`) as plugin `github`
- **Codex / ChatGPT:** repo marketplace `.agents/plugins/marketplace.json` entry `github` → `./plugins/github`

## License

MIT — see repository root `LICENSE`.
