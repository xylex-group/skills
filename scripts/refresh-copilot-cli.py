#!/usr/bin/env python3
"""Register and refresh this repo in the local GitHub Copilot CLI marketplace.

Best-effort: if `copilot` is not on PATH (e.g. CI), exits 0 with a skip message.
Does not fail the build when the CLI is absent.

Env:
  COPILOT_MARKETPLACE_SOURCE  GitHub owner/repo or local path
                              (default: xylex-group/skills)
  COPILOT_MARKETPLACE_NAME    Registered marketplace name
                              (default: xylex-group — matches marketplace.json name)
  SKIP_COPILOT_REFRESH=1      Force skip

Usage:
  python scripts/refresh-copilot-cli.py
  bun run refresh:copilot
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


def find_copilot() -> str | None:
    """Resolve a spawnable copilot binary (Windows prefers .cmd over .ps1)."""
    names = (
        ("copilot.cmd", "copilot.exe", "copilot")
        if sys.platform == "win32"
        else ("copilot",)
    )
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    return None


def run_copilot(
    copilot: str, args: list[str]
) -> subprocess.CompletedProcess[str]:
    # shell=True on Windows so npm shims (.cmd) resolve correctly
    if sys.platform == "win32":
        cmdline = subprocess.list2cmdline([copilot, *args])
        return subprocess.run(
            cmdline,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    return subprocess.run(
        [copilot, *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main() -> int:
    if os.environ.get("SKIP_COPILOT_REFRESH", "").strip() in ("1", "true", "yes"):
        print("refresh-copilot-cli: skipped (SKIP_COPILOT_REFRESH)")
        return 0

    copilot = find_copilot()
    if copilot is None:
        print(
            "refresh-copilot-cli: copilot CLI not on PATH — skip "
            "(install @github/copilot to refresh local marketplaces)"
        )
        return 0

    source = os.environ.get("COPILOT_MARKETPLACE_SOURCE", "xylex-group/skills").strip()
    name = os.environ.get("COPILOT_MARKETPLACE_NAME", "xylex-group").strip()

    # Prefer local clone when run from this repo so unpushed catalog fixes apply.
    repo_root = Path(__file__).resolve().parent.parent
    local_catalog = repo_root / ".github" / "plugin" / "marketplace.json"
    if local_catalog.is_file() and source == "xylex-group/skills":
        # Use absolute path so Copilot re-reads the working tree.
        source = str(repo_root)

    listed = run_copilot(copilot, ["plugin", "marketplace", "list"])
    list_out = (listed.stdout or "") + (listed.stderr or "")
    registered = name in list_out or f'"{name}"' in list_out

    if not registered:
        print(f"refresh-copilot-cli: adding marketplace {source!r} as {name!r}")
        add = run_copilot(copilot, ["plugin", "marketplace", "add", source])
        add_out = ((add.stdout or "") + (add.stderr or "")).strip()
        if add.returncode != 0:
            # Already present under another listing shape — try update anyway.
            print(
                f"refresh-copilot-cli: add returned {add.returncode}: {add_out}",
                file=sys.stderr,
            )
        else:
            print(add_out or f"Marketplace {name!r} added.")
    else:
        print(f"refresh-copilot-cli: marketplace {name!r} already registered")
        # Re-add from local path when registered against remote only, so the
        # local catalog is what refresh points at during development.
        if Path(source).is_dir():
            # remove + re-add local is heavy; update is enough when source is github
            pass

    print(f"refresh-copilot-cli: updating marketplace {name!r} (source={source})")
    update = run_copilot(copilot, ["plugin", "marketplace", "update", name])
    update_out = ((update.stdout or "") + (update.stderr or "")).strip()
    if update.returncode != 0:
        # Fallback: update all marketplaces
        print(
            f"refresh-copilot-cli: named update failed ({update.returncode}): "
            f"{update_out}; trying full update",
            file=sys.stderr,
        )
        update = run_copilot(copilot, ["plugin", "marketplace", "update"])
        update_out = ((update.stdout or "") + (update.stderr or "")).strip()
        if update.returncode != 0:
            print(
                f"refresh-copilot-cli: update failed: {update_out}",
                file=sys.stderr,
            )
            return update.returncode

    print(update_out or f"Marketplace {name!r} updated.")

    browse = run_copilot(copilot, ["plugin", "marketplace", "browse", name])
    browse_out = ((browse.stdout or "") + (browse.stderr or "")).strip()
    if browse.returncode == 0:
        # Compact summary: count plugins
        lines = [
            ln
            for ln in browse_out.splitlines()
            if ln.strip().startswith("•") or ln.strip().startswith("*")
        ]
        print(
            f"refresh-copilot-cli: browse OK — {len(lines)} plugin(s) in {name!r}"
        )
        print(f"  install example: copilot plugin install athena@{name}")
    else:
        print(
            f"refresh-copilot-cli: browse warning ({browse.returncode}): {browse_out}",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
