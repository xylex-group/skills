# HeroUI CLI Reference

**Category:** react  
**URL:** https://heroui.com/en/docs/react/getting-started/cli  
**Source MDX:** https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/getting-started/(overview)/cli.mdx  
**Issues:** https://github.com/heroui-inc/heroui-cli/issues

Use the CLI to manage HeroUI dependencies and initialize projects. Install, uninstall, or upgrade packages; assess project health; download documentation for AI coding agents.

---

## Installation

**Requirements:** Node.js version **22.22.0** or later.

### Global

```bash
npm install heroui-cli@latest -g
```

### Without global install

```bash
pnpm dlx heroui-cli@latest
npx heroui-cli@latest
yarn dlx heroui-cli@latest
bunx heroui-cli@latest
```

---

## Help surface

```bash
heroui
```

```text
Usage: heroui [command]

Options:
  -v, --version                  Output the current version
  --no-cache                     Disable cache, by default data will be cached for 30m after the first request
  -d, --debug                    Debug mode will not install dependencies
  -h --help                      Display help information for commands

Commands:
  init [options] [projectName]   Initializes a new project
  install [options]              Installs @heroui/react and @heroui/styles to your project
  upgrade [options]              Upgrades @heroui/react and @heroui/styles to the latest versions
  uninstall [options]            Uninstall @heroui/react and @heroui/styles from the project
  list [options]                 Lists installed HeroUI packages (@heroui/react, @heroui/styles)
  env [options]                  Displays debugging information for the local environment
  doctor [options]               Checks for issues in the project
  agents-md [options]            Downloads HeroUI documentation for AI coding agents
  help [command]                 Display help for command
```

---

## init

Initialize a new HeroUI project.

```bash
heroui init [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-t --template [string]` | Template: `app`, `pages`, `vite`, `react-router` |
| `-p --package [string]` | Package manager for the new project |

**Interactive flow (summary):**

1. Select template:
   - **App** — Next.js 16 app directory + HeroUI v3 + Tailwind
   - **Pages** — Next.js 16 pages directory + HeroUI v3 + Tailwind
   - **Vite** — Vite + HeroUI v3 + Tailwind
   - **React Router** — React Router + HeroUI v3 + Tailwind
2. Project name (default e.g. `my-heroui-app`)
3. Package manager: npm | yarn | pnpm | bun

**After create:**

```bash
cd my-heroui-app
npm install   # or pnpm / yarn / bun install
npm run dev
```

---

## install

Install `@heroui/react` and `@heroui/styles` plus peer dependencies. No-op if already installed.

```bash
heroui install [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p --packagePath [string]` | Path to `package.json` |

Peers typically include `react`, `react-dom`, and `tailwindcss` (versions shown at install time).

---

## upgrade

Upgrade `@heroui/react` and `@heroui/styles` (and peers as needed) to latest.

```bash
heroui upgrade [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p --packagePath [string]` | Path to `package.json` |

---

## uninstall

Uninstall `@heroui/react` and `@heroui/styles`. **Peer dependencies are not uninstalled.**

```bash
heroui uninstall [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p --packagePath [string]` | Path to `package.json` |

---

## list

List installed HeroUI packages (`@heroui/react`, `@heroui/styles`).

```bash
heroui list [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p --packagePath [string]` | Path to `package.json` |

---

## doctor

Check project issues:

- Whether `@heroui/react` and `@heroui/styles` are installed
- Whether required peer dependencies are installed and meet minimums

```bash
heroui doctor [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p --packagePath [string]` | Path to `package.json` |

**Example failure:** missing `@heroui/styles` → run `heroui install`.

**Healthy:**

```text
✅ Your project has no detected issues.
```

---

## env

Display debug information about the local environment (packages, OS, Node).

```bash
heroui env [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-p --packagePath [string]` | Path to `package.json` |

Useful when filing issues against heroui-cli.

---

## agents-md

Download HeroUI documentation for AI coding agents (Claude, Cursor, Grok, etc.). Clones latest docs from the HeroUI repository and injects a compact index into `AGENTS.md` or `CLAUDE.md`.

```bash
heroui agents-md [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--react` | Include React docs only |
| `--native` | Include Native docs only |
| `--migration` | Include v2 → v3 migration docs only |
| `--output <file>` | Target file (e.g. `AGENTS.md`, `CLAUDE.md`) |
| `--ssh` | Use SSH instead of HTTPS for git clone |

Only **one** of `--react`, `--native`, or `--migration` at a time.

**Examples:**

```bash
heroui agents-md
heroui agents-md --react --output AGENTS.md
heroui agents-md --native --output CLAUDE.md
heroui agents-md --migration --output AGENTS.md
```

**How it works:**

1. Clones docs from the `v3` branch using git sparse-checkout
2. Generates a compact index of doc and demo files
3. Injects the index between markers:
   - React: `<!-- HEROUI-REACT-AGENTS-MD-START -->` / `<!-- HEROUI-REACT-AGENTS-MD-END -->`
   - Similar markers for Native and Migration
4. Adds `.heroui-docs/` to `.gitignore`

See also: https://heroui.com/docs/react/getting-started/agents-md

**Analytics:** anonymous usage data (selection, output file names, duration, success/error). Opt out:

```bash
HEROUI_ANALYTICS_DISABLED=1
```

---

## Reporting issues

Bugs: https://github.com/heroui-inc/heroui-cli/issues
