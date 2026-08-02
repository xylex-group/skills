# XBP plugin

Plugin packaging XBP agent skills (ops CLI, deploy engine, OCI registry, Cloudflare Workers setup) for Grok Build and Codex / ChatGPT.

Skills were sourced from the local Grok skills library (`~/.grok/skills/xbp`, `setup-xbp-deploy`) and live under `skills/`.

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest (`skills: ./skills/`) |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `skills/` | Bundled XBP skills |

## Install

- **Grok:** XYLEX Group marketplace (`xylex-group/skills`) as plugin `xbp`
- **Codex / ChatGPT:** repo marketplace `.agents/plugins/marketplace.json` entry `xbp` → `./plugins/xbp`

## License

MIT — see repository root `LICENSE`.
