# Athena plugin

Plugin packaging Athena agent skills (auth, JS/Rust SDKs, billing, storage, workspace map) for Grok Build and Codex / ChatGPT.

Skills were sourced from the local Grok skills library (`~/.grok/skills/athena-*`) and live under `skills/`.

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest (`skills: ./skills/`) |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `skills/` | Bundled Athena skills |

## Install

- **Grok:** XYLEX Group marketplace (`xylex-group/skills`) as plugin `athena`
- **Codex / ChatGPT:** repo marketplace `.agents/plugins/marketplace.json` entry `athena` → `./plugins/athena`

## License

MIT — see repository root `LICENSE`.
