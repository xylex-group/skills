#!/usr/bin/env python3
"""Compute blast-zone reference counts and line footprints for function clusters."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any


def load_manifest(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Manifest must be a JSON array.")
    return data


def count_lines(path: Path) -> int:
    if not path.is_file():
        return 0
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        return sum(1 for _ in handle)


def rg_files(repo_root: Path, pattern: str, glob_exclude: str | None = None) -> list[str]:
    cmd = ["rg", "-l", pattern, str(repo_root)]
    if glob_exclude:
        cmd.extend(["--glob", f"!{glob_exclude}"])
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode not in (0, 1):
        return []
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    rel: list[str] = []
    for line in lines:
        try:
            rel.append(str(Path(line).resolve().relative_to(repo_root.resolve())))
        except ValueError:
            rel.append(line)
    return sorted(set(rel))


def symbol_pattern(name: str) -> str:
    # Word boundary for Rust/TS/JS style identifiers
    return rf"\b{re.escape(name)}\b"


def blame_snapshot(repo_root: Path, relative_path: str) -> str:
    result = subprocess.run(
        ["git", "blame", "--line-porcelain", "--", relative_path],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return "n/a"
    counts: Counter[str] = Counter()
    for line in result.stdout.splitlines():
        if line.startswith("author "):
            counts[line[7:]] += 1
    if not counts:
        return "n/a"
    return "; ".join(f"{author} ({count})" for author, count in counts.most_common(3))


def analyze_cluster(repo_root: Path, cluster: dict[str, Any]) -> dict[str, Any]:
    symbols = cluster.get("symbols")
    if not isinstance(symbols, list) or not symbols:
        raise ValueError(f"Cluster '{cluster.get('name', '<unnamed>')}' needs symbols.")

    symbol_names: list[str] = []
    files: set[str] = set()
    missing_files: list[str] = []

    for entry in symbols:
        if isinstance(entry, dict):
            name = entry.get("name")
            file_path = entry.get("file")
            if isinstance(name, str):
                symbol_names.append(name)
            if isinstance(file_path, str):
                files.add(file_path)
                full = repo_root / file_path
                if not full.is_file():
                    missing_files.append(file_path)
        elif isinstance(entry, str):
            symbol_names.append(entry)

    total_lines = sum(count_lines(repo_root / f) for f in files)

    caller_files: set[str] = set()
    for name in symbol_names:
        pattern = symbol_pattern(name)
        for rel in rg_files(repo_root, pattern):
            if rel not in files:
                caller_files.add(rel)

    test_callers = sorted(
        f for f in caller_files if re.search(r"(^|/)(tests?|__tests__|spec)(/|$)", f)
    )

    blast_label = "Narrow"
    caller_count = len(caller_files)
    if caller_count >= 10:
        blast_label = "Wide"
    elif caller_count >= 4:
        blast_label = "Medium"

    blame_parts = [blame_snapshot(repo_root, f) for f in sorted(files)[:3]]

    return {
        "name": cluster.get("name", "<unnamed>"),
        "type": cluster.get("type", "unknown"),
        "symbol_count": len(symbol_names),
        "symbols": symbol_names,
        "definition_files": sorted(files),
        "definition_lines": total_lines,
        "caller_file_count": caller_count,
        "caller_files_sample": sorted(caller_files)[:8],
        "test_caller_count": len(test_callers),
        "blast_label": blast_label,
        "canonical_target": cluster.get("canonical_target"),
        "yield_hint": cluster.get("yield_hint"),
        "risk_hint": cluster.get("risk_hint"),
        "blame_snapshot": " | ".join(blame_parts),
        "missing_files": missing_files,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--repo", default=".", type=Path)
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of table")
    args = parser.parse_args()

    repo_root = args.repo.resolve()
    clusters = load_manifest(args.manifest.resolve())
    results = [analyze_cluster(repo_root, cluster) for cluster in clusters]

    if args.json:
        print(json.dumps(results, indent=2))
        return 0

    for row in results:
        print(f"## {row['name']} ({row['type']})")
        print(f"  symbols: {', '.join(row['symbols'])}")
        print(f"  definition_lines: {row['definition_lines']} in {len(row['definition_files'])} files")
        print(f"  blast: {row['blast_label']} — {row['caller_file_count']} caller files")
        if row["caller_files_sample"]:
            print(f"  callers_sample: {', '.join(row['caller_files_sample'])}")
        print(f"  test_callers: {row['test_caller_count']}")
        if row.get("canonical_target"):
            print(f"  canonical: {row['canonical_target']}")
        if row.get("yield_hint") is not None or row.get("risk_hint") is not None:
            print(f"  hints: yield={row.get('yield_hint')} risk={row.get('risk_hint')}")
        if row["missing_files"]:
            print(f"  missing_files: {', '.join(row['missing_files'])}")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())