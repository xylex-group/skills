# Rust

Plugin packaging **Rust** agent skills for Grok Build and Codex / ChatGPT.

Default icon: `assets/xbp.png`. Skills: **6**.

```bash
bun run process:raw-skills -- --plugin rust
```

## Skills

- `gov-uk-rs-sdk`
- `path-rs`
- `rust-best-practices`
- `rust-contract-spine`
- `rust-crate-setup`
- `rust-workspace-crates`

## Layout

| Path | Purpose |
| --- | --- |
| `.codex-plugin/plugin.json` | Codex / ChatGPT plugin manifest |
| `.grok-plugin/plugin.json` | Grok Build plugin identity |
| `assets/xbp.png` | Standard plugin icon |
| `skills/` | Bundled skills |

## License

MIT — see repository root `LICENSE`.
