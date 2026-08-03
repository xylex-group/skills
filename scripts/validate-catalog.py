#!/usr/bin/env python3
"""Validate the marketplace catalog index.

Enforces:

  - kebab-case plugin names, clear description, https homepage
  - LICENSE present at the repository root
  - for every plugin with `"source": {"source": "url", ...}`:
      - `sha` field is present and non-empty
      - `sha` is a 40-character lowercase hex string (full commit SHA, not a
        tag, branch, or abbreviation)

This is the catalog-level enforcement layer for SHA pinning. Without a
pin, the installer would fall back to `git clone --branch <ref>` (or HEAD),
which means a vendor force-push or repo compromise immediately ships to
every user who installs or updates that plugin. Pinning to a specific
commit + content-verifying it at install time is the only thing that
survives that class of attack.

The runtime side (the Grok CLI plugin installer) verifies
`git rev-parse HEAD == sha` after clone — these two layers together give
us content-addressable plugin pinning.

Run locally:    python scripts/validate-catalog.py
                bun run validate:catalog
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SHA_RE = re.compile(r"^[0-9a-f]{40}$")

# Lookup order matches the marketplace index loader in the Grok CLI.
# (GitHub Copilot uses .github/plugin/marketplace.json separately — see
# validate_copilot_catalog.)
CATALOG_PATHS = [
    Path(".grok-plugin/marketplace.json"),
    Path(".claude-plugin/marketplace.json"),
]

COPILOT_CATALOG_PATHS = [
    Path(".github/plugin/marketplace.json"),
    Path(".plugin/marketplace.json"),
]


NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def validate_entry(entry: dict, idx: int) -> list[str]:
    """Return a list of human-readable error strings for a single plugin entry."""
    errors: list[str] = []
    raw_name = entry.get("name")
    name = raw_name if isinstance(raw_name, str) and raw_name else f"<unnamed at index {idx}>"

    if not isinstance(raw_name, str) or not raw_name.strip():
        errors.append(f"plugin at index {idx}: missing kebab-case `name`")
    elif not NAME_RE.match(raw_name):
        errors.append(
            f"plugin '{name}': name must be kebab-case "
            f"([a-z0-9][a-z0-9-]*), got {raw_name!r}"
        )

    description = entry.get("description")
    if not isinstance(description, str) or not description.strip():
        errors.append(f"plugin '{name}': missing clear `description`")

    homepage = entry.get("homepage")
    if not isinstance(homepage, str) or not homepage.startswith("https://"):
        errors.append(
            f"plugin '{name}': `homepage` must be an https:// URL "
            f"(got {homepage!r})"
        )

    license_ = entry.get("license")
    if license_ is not None and (
        not isinstance(license_, str) or not license_.strip()
    ):
        errors.append(f"plugin '{name}': `license` must be a non-empty string when set")

    source = entry.get("source")
    if source is None:
        errors.append(f"plugin '{name}': missing `source`")
        return errors

    # String-form sources like "./plugins/foo" are local paths; no sha needed.
    if not isinstance(source, dict):
        if not isinstance(source, str) or not source.strip():
            errors.append(f"plugin '{name}': `source` must be a path string or object")
        return errors

    if source.get("source") != "url" and source.get("type") != "url":
        # Local object form { "type": "local", "path": "..." }
        path = source.get("path")
        if source.get("type") == "local" and (
            not isinstance(path, str) or not path.strip()
        ):
            errors.append(
                f"plugin '{name}': local source must include a non-empty `path`"
            )
        return errors

    sha = source.get("sha")
    if not sha:
        errors.append(
            f"plugin '{name}': missing `sha` field on url source "
            f"(url={source.get('url')!r}). All url-sourced plugins must "
            f"be pinned to a specific commit so a vendor force-push can't "
            f"silently ship new code to installed users."
        )
        return errors

    if not isinstance(sha, str):
        errors.append(
            f"plugin '{name}': sha must be a string, got {type(sha).__name__}"
        )
        return errors

    if not SHA_RE.match(sha):
        errors.append(
            f"plugin '{name}': sha {sha!r} is not a 40-character lowercase "
            f"hex string. Use the full commit SHA — not a tag, branch, or "
            f"abbreviated SHA."
        )

    path = source.get("path")
    if path is not None:
        if not isinstance(path, str) or not path.strip():
            errors.append(
                f"plugin '{name}': url source `path` must be a non-empty string when present."
            )
        elif (
            path.startswith("/")
            or "\\" in path
            or any(part in ("..", "") for part in path.split("/"))
        ):
            errors.append(
                f"plugin '{name}': url source `path` {path!r} must be a relative "
                f"subdirectory inside the repo (no leading '/', no '..', no backslashes)."
            )

    return errors


def validate_file(path: Path) -> list[str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"{path}: failed to parse: {e}"]

    plugins = data.get("plugins", [])
    if not isinstance(plugins, list):
        return [f"{path}: `plugins` must be an array, got {type(plugins).__name__}"]

    errors: list[str] = []
    for idx, entry in enumerate(plugins):
        if not isinstance(entry, dict):
            errors.append(f"{path}: plugin index {idx} must be an object")
            continue
        errors.extend(f"{path}: {e}" for e in validate_entry(entry, idx))
    return errors


def validate_copilot_entry(entry: dict, idx: int) -> list[str]:
    """GitHub Copilot marketplace entries use string (or github/url object) sources."""
    errors: list[str] = []
    raw_name = entry.get("name")
    name = raw_name if isinstance(raw_name, str) and raw_name else f"<unnamed at index {idx}>"

    if not isinstance(raw_name, str) or not raw_name.strip():
        errors.append(f"plugin at index {idx}: missing kebab-case `name`")
    elif not NAME_RE.match(raw_name):
        errors.append(
            f"plugin '{name}': name must be kebab-case "
            f"([a-z0-9][a-z0-9-]*), got {raw_name!r}"
        )

    description = entry.get("description")
    if description is not None and (
        not isinstance(description, str) or not description.strip()
    ):
        errors.append(f"plugin '{name}': `description` must be a non-empty string when set")

    source = entry.get("source")
    if source is None:
        errors.append(f"plugin '{name}': missing `source`")
    elif isinstance(source, str):
        if not source.strip():
            errors.append(f"plugin '{name}': `source` path must be non-empty")
        elif source.startswith("/") or "\\" in source or ".." in source.split("/"):
            errors.append(
                f"plugin '{name}': `source` path {source!r} must be a relative path "
                f"inside the repo (no leading '/', no '..', no backslashes)"
            )
    elif isinstance(source, dict):
        kind = source.get("source")
        if kind not in ("github", "url"):
            errors.append(
                f"plugin '{name}': object `source` must use source='github' or "
                f"source='url' (got {kind!r})"
            )
    else:
        errors.append(
            f"plugin '{name}': `source` must be a relative path string or "
            f"github/url object"
        )
    return errors


def validate_copilot_file(path: Path) -> list[str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"{path}: failed to parse: {e}"]

    errors: list[str] = []
    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        errors.append(f"{path}: missing top-level kebab-case `name`")
    elif not NAME_RE.match(name):
        errors.append(f"{path}: marketplace `name` must be kebab-case, got {name!r}")

    owner = data.get("owner")
    if not isinstance(owner, dict) or not isinstance(owner.get("name"), str):
        errors.append(f"{path}: `owner` must be an object with `name`")

    plugins = data.get("plugins", [])
    if not isinstance(plugins, list):
        return errors + [
            f"{path}: `plugins` must be an array, got {type(plugins).__name__}"
        ]
    if not plugins:
        errors.append(f"{path}: `plugins` must list at least one plugin")

    for idx, entry in enumerate(plugins):
        if not isinstance(entry, dict):
            errors.append(f"{path}: plugin index {idx} must be an object")
            continue
        errors.extend(f"{path}: {e}" for e in validate_copilot_entry(entry, idx))
    return errors


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    catalog_files = [p for p in CATALOG_PATHS if (repo_root / p).exists()]
    if not catalog_files:
        print(
            "ERROR: no catalog file found. Expected one of: "
            + ", ".join(str(p) for p in CATALOG_PATHS),
            file=sys.stderr,
        )
        return 1

    all_errors: list[str] = []
    for rel in catalog_files:
        all_errors.extend(validate_file(repo_root / rel))

    copilot_files = [p for p in COPILOT_CATALOG_PATHS if (repo_root / p).exists()]
    if not copilot_files:
        all_errors.append(
            "GitHub Copilot marketplace missing. Expected at least one of: "
            + ", ".join(str(p) for p in COPILOT_CATALOG_PATHS)
        )
    else:
        for rel in copilot_files:
            all_errors.extend(validate_copilot_file(repo_root / rel))
        # Keep canonical + alternate discovery paths identical when both exist.
        if len(copilot_files) >= 2:
            bodies = [
                (repo_root / p).read_text(encoding="utf-8") for p in copilot_files
            ]
            if any(b != bodies[0] for b in bodies[1:]):
                all_errors.append(
                    "Copilot marketplace mirrors diverge: "
                    + " and ".join(str(p) for p in copilot_files)
                    + " must be identical"
                )

    license_file = repo_root / "LICENSE"
    if not license_file.is_file():
        all_errors.append(
            "LICENSE missing at the repository root "
            "(state MIT or another OSI license there)."
        )

    if all_errors:
        print("Catalog validation failed:", file=sys.stderr)
        for e in all_errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    summary = " + ".join(str(p) for p in catalog_files + copilot_files)
    print(f"Catalog OK ({summary})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
