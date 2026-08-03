#!/usr/bin/env python3
"""Generate GitHub Copilot marketplace catalogs + per-plugin .plugin/plugin.json.

Reads first-party plugin lists from:
  - .agents/plugins/marketplace.json  (install order + local paths)
  - .grok-plugin/marketplace.json      (descriptions, versions, keywords, …)

Writes (identical content):
  - .github/plugin/marketplace.json   (canonical Copilot path)
  - .plugin/marketplace.json          (alternate discovery path)

Ensures every plugins/<name>/ has .plugin/plugin.json for Copilot CLI/App
(preferred source: .codex-plugin/plugin.json, else .grok-plugin/plugin.json).

Usage:
  python scripts/sync-copilot-marketplace.py
  python scripts/sync-copilot-marketplace.py --check
  bun run build:copilot-marketplace
  bun run build:copilot-marketplace:check
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
GROK_MARKETPLACE = REPO_ROOT / ".grok-plugin" / "marketplace.json"
CODEX_MARKETPLACE = REPO_ROOT / ".agents" / "plugins" / "marketplace.json"
COPILOT_PRIMARY = REPO_ROOT / ".github" / "plugin" / "marketplace.json"
COPILOT_ALT = REPO_ROOT / ".plugin" / "marketplace.json"
PLUGINS_DIR = REPO_ROOT / "plugins"

MARKETPLACE_NAME = "xylex-group"
OWNER = {
    "name": "XYLEX Group",
    "url": "https://github.com/xylex-group",
}
METADATA = {
    "description": (
        "Official XYLEX Group plugin marketplace for GitHub Copilot, Grok, and Codex"
    ),
    "version": "1.0.0",
    "pluginRoot": "plugins",
}

MANIFEST_SOURCES = (
    Path(".codex-plugin") / "plugin.json",
    Path(".grok-plugin") / "plugin.json",
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(data: Any) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def write_if_changed(path: Path, content: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.read_text(encoding="utf-8") == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def local_source_path(entry: dict[str, Any], name: str) -> str:
    source = entry.get("source")
    if isinstance(source, str) and source.strip():
        path = source.strip()
    elif isinstance(source, dict):
        path = source.get("path") or f"./plugins/{name}"
        if not isinstance(path, str) or not path.strip():
            path = f"./plugins/{name}"
    else:
        path = f"./plugins/{name}"
    if path in (".", "./"):
        return "./"
    if not path.startswith("./") and not path.startswith("/"):
        return f"./{path}"
    return path


def build_marketplace() -> dict[str, Any]:
    if not CODEX_MARKETPLACE.is_file():
        raise SystemExit(f"missing Codex marketplace: {CODEX_MARKETPLACE}")
    if not GROK_MARKETPLACE.is_file():
        raise SystemExit(f"missing Grok marketplace: {GROK_MARKETPLACE}")

    codex = load_json(CODEX_MARKETPLACE)
    grok = load_json(GROK_MARKETPLACE)
    grok_by_name = {
        p["name"]: p
        for p in grok.get("plugins", [])
        if isinstance(p, dict) and isinstance(p.get("name"), str)
    }

    plugins_out: list[dict[str, Any]] = []
    for entry in codex.get("plugins", []):
        if not isinstance(entry, dict):
            continue
        name = entry.get("name")
        if not isinstance(name, str) or not name:
            continue
        g = grok_by_name.get(name, {})
        plugin: dict[str, Any] = {
            "name": name,
            "description": g.get("description")
            or f"{name} agent skills for GitHub Copilot",
            "version": g.get("version") or "1.0.0",
            "source": local_source_path(entry, name),
            "license": g.get("license") or "MIT",
            "author": g.get("author")
            or {"name": "XYLEX Group", "url": "https://github.com/xylex-group"},
            "repository": g.get("repository")
            or "https://github.com/xylex-group/skills",
        }
        if isinstance(g.get("homepage"), str) and g["homepage"].startswith("https://"):
            plugin["homepage"] = g["homepage"]
        if isinstance(g.get("keywords"), list) and g["keywords"]:
            plugin["keywords"] = g["keywords"]
        if isinstance(g.get("category"), str) and g["category"].strip():
            plugin["category"] = g["category"]
        plugins_out.append(plugin)

    return {
        "name": MARKETPLACE_NAME,
        "owner": OWNER,
        "metadata": METADATA,
        "plugins": plugins_out,
    }


def copilot_plugin_manifest(plugin_dir: Path) -> dict[str, Any] | None:
    source: dict[str, Any] | None = None
    for rel in MANIFEST_SOURCES:
        path = plugin_dir / rel
        if path.is_file():
            data = load_json(path)
            if isinstance(data, dict):
                source = data
                break
    if source is None:
        return None

    name = source.get("name") or plugin_dir.name
    out: dict[str, Any] = {
        "name": name,
        "version": source.get("version") or "1.0.0",
        "description": source.get("description") or f"{name} agent skills",
        "author": source.get("author")
        or {"name": "XYLEX Group", "url": "https://github.com/xylex-group"},
        "license": source.get("license") or "MIT",
    }
    for key in ("homepage", "repository", "keywords", "category", "tags"):
        if key in source:
            out[key] = source[key]
    skills = source.get("skills", "./skills/")
    if isinstance(skills, str) and skills.strip():
        out["skills"] = skills
    else:
        out["skills"] = "./skills/"
    return out


def sync_plugin_manifests() -> list[str]:
    """Write missing/outdated plugins/*/ .plugin/plugin.json. Returns changed paths."""
    changed: list[str] = []
    if not PLUGINS_DIR.is_dir():
        return changed
    for plugin_dir in sorted(p for p in PLUGINS_DIR.iterdir() if p.is_dir()):
        manifest = copilot_plugin_manifest(plugin_dir)
        if manifest is None:
            continue
        target = plugin_dir / ".plugin" / "plugin.json"
        content = dump_json(manifest)
        if write_if_changed(target, content):
            changed.append(str(target.relative_to(REPO_ROOT)))
    return changed


def generate() -> tuple[list[str], dict[str, Any]]:
    marketplace = build_marketplace()
    content = dump_json(marketplace)
    changed: list[str] = []
    for path in (COPILOT_PRIMARY, COPILOT_ALT):
        if write_if_changed(path, content):
            changed.append(str(path.relative_to(REPO_ROOT)))
    changed.extend(sync_plugin_manifests())
    return changed, marketplace


def check() -> int:
    marketplace = build_marketplace()
    content = dump_json(marketplace)
    errors: list[str] = []

    for path in (COPILOT_PRIMARY, COPILOT_ALT):
        rel = path.relative_to(REPO_ROOT)
        if not path.is_file():
            errors.append(f"missing {rel}")
            continue
        on_disk = path.read_text(encoding="utf-8")
        if on_disk != content:
            errors.append(f"stale {rel} — run: python scripts/sync-copilot-marketplace.py")

    if COPILOT_PRIMARY.is_file() and COPILOT_ALT.is_file():
        if COPILOT_PRIMARY.read_text(encoding="utf-8") != COPILOT_ALT.read_text(
            encoding="utf-8"
        ):
            errors.append(
                "Copilot marketplace mirrors diverge "
                "(.github/plugin vs .plugin) — run sync script"
            )

    if PLUGINS_DIR.is_dir():
        for plugin_dir in sorted(p for p in PLUGINS_DIR.iterdir() if p.is_dir()):
            expected = copilot_plugin_manifest(plugin_dir)
            if expected is None:
                continue
            target = plugin_dir / ".plugin" / "plugin.json"
            rel = target.relative_to(REPO_ROOT)
            if not target.is_file():
                errors.append(f"missing {rel}")
                continue
            on_disk = target.read_text(encoding="utf-8")
            if on_disk != dump_json(expected):
                errors.append(f"stale {rel}")

    if errors:
        print("Copilot marketplace check failed:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    plugin_count = len(marketplace.get("plugins", []))
    print(
        f"Copilot marketplace OK "
        f"({COPILOT_PRIMARY.relative_to(REPO_ROOT)} + "
        f"{COPILOT_ALT.relative_to(REPO_ROOT)}, {plugin_count} plugins)"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if generated catalogs/manifests differ from disk",
    )
    args = parser.parse_args()

    if args.check:
        return check()

    changed, marketplace = generate()
    plugin_count = len(marketplace.get("plugins", []))
    if changed:
        print(f"Synced Copilot marketplace ({plugin_count} plugins). Updated:")
        for path in changed:
            print(f"  - {path}")
    else:
        print(f"Copilot marketplace already up to date ({plugin_count} plugins).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
