# nvim-config path map

Root: `C:\Users\floris\AppData\Local\nvim`  
Skill: `C:\Users\floris\.grok\skills\nvim-config\`

## Bootstrap (`init.lua`)

1. `mapleader`, `base46_cache`
2. **`configs.term_junk`** — `setup_clipboard()` + `start()` (before lazy)
3. lazy.nvim bootstrap
4. `lazy.setup` — NvChad v2.5 + `plugins`
5. base46 cache dofiles
6. `options` → `autocmds` → scheduled `mappings`

## User Lua

| File | Notes |
|------|--------|
| `init.lua` | Bootstrap; term_junk must stay early |
| `lua/chadrc.lua` | base46 theme `github_light`, comment colors |
| `lua/options.lua` | indent folds, `ttimeout` / `ttimeoutlen=50` |
| `lua/mappings.lua` | Telescope, conform, render-markdown globals |
| `lua/autocmds.lua` | mdx ft; md/mdx wrap + buffer maps `<leader>mr`/`md` |
| `lua/configs/term_junk.lua` | Scrub `+q`+hex (e.g. `+q4D73`); Win32 clipboard; plain `find("+q")` |
| `lua/configs/lazy.lua` | lazy UI + disabled stock rtp plugins |
| `lua/configs/lsp-servers.lua` | Server names only |
| `lua/configs/lspconfig.lua` | rust_analyzer + pyright settings; `vim.lsp.enable` |
| `lua/configs/conform.lua` | formatters_by_ft + tools |
| `lua/configs/render-markdown.lua` | In-buffer md/mdx tables/code/etc. |
| `lua/plugins/init.lua` | conform, telescope, mason*, lspconfig, treesitter, render-markdown |

## Plugins (user layer)

- conform, telescope, mason-lspconfig, mason-tool-installer, nvim-lspconfig
- nvim-treesitter (main): install langs including markdown + markdown_inline; register mdx→markdown
- render-markdown.nvim: ft markdown/mdx/quarto/rmd

## LSP servers

`lua_ls`, `rust_analyzer`, `pyright`, `taplo`, `jsonls`, `ts_ls`, `cssls`, `html`, `yamlls`, `sqls`

## External (not in repo)

| Path | Notes |
|------|--------|
| `%APPDATA%\alacritty\alacritty.toml` | nu.exe, JetBrainsMono Nerd Font, TERM=xterm-256color |
| `C:\Program Files\Neovim\bin\nvim.exe` | Neovim 0.12.x install |

## term_junk scrub contract

- Pattern remove: `"%+q[%x]+"` (Lua pattern)
- Presence check: plain `find("+q", 1, true)` — never plain `"%+q"`
- Trims spaces left by ` +q4D73`
- Clears `modified` when buffer was only junk
- Manual: `:lua require("configs.term_junk").scrub_all()`
