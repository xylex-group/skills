#!/usr/bin/env python3
"""Compute line-count and blame summaries for duplicate/dead-code audit clusters."""

from __future__ import annotations

import argparse
import json
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
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        return sum(1 for _ in handle)


def blame_counts(repo_root: Path, relative_path: str) -> Counter[str]:
    result = subprocess.run(
        ["git", "blame", "--line-porcelain", "--", relative_path],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return Counter()

    counts: Counter[str] = Counter()
    for line in result.stdout.splitlines():
        if line.startswith("author "):
            counts[line[7:]] += 1
    return counts


def format_blame(counter: Counter[str]) -> str:
    if not counter:
        return "n/a"
    parts = [f"{author} ({count})" for author, count in counter.most_common()]
    return "; ".join(parts)


def inventory_cluster(repo_root: Path, cluster: dict[str, Any]) -> dict[str, Any]:
    files = cluster.get("files")
    if not isinstance(files, list) or not files:
        raise ValueError(f"Cluster '{cluster.get('name', '<unnamed>')}' must define a non-empty files list.")

    total_lines = 0
    blame_totals: Counter[str] = Counter()
    missing_files: list[str] = []

    for relative in files:
        path = repo_root / relative
        if not path.exists():
            missing_files.append(relative)
            continue
        total_lines += count_lines(path)
        blame_totals.update(blame_counts(repo_root, relative))

    result = dict(cluster)
    result["file_count"] = len(files)
    result["total_lines"] = total_lines
    result["blame_snapshot"] = format_blame(blame_totals)
    result["missing_files"] = missing_files
    return result


def to_markdown(rows: list[dict[str, Any]]) -> str:
    header = [
        "| Cluster | Type | Files | Total lines | Estimated savings | Blame snapshot | Status |",
        "| --- | --- | ---: | ---: | --- | --- | --- |",
    ]
    body = []
    for row in rows:
        body.append(
            "| {name} | {type} | {file_count} | {total_lines} | {estimated_savings} | {blame_snapshot} | {status} |".format(
                name=row.get("name", ""),
                type=row.get("type", ""),
                file_count=row.get("file_count", 0),
                total_lines=row.get("total_lines", 0),
                estimated_savings=row.get("estimated_savings", ""),
                blame_snapshot=row.get("blame_snapshot", "n/a"),
                status=row.get("status", ""),
            )
        )
    return "\n".join(header + body)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, help="Path to the cluster manifest JSON file.")
    parser.add_argument(
        "--root",
        default=".",
        help="Repository root for file paths and git blame. Defaults to the current working directory.",
    )
    parser.add_argument(
        "--format",
        choices=("json", "markdown"),
        default="json",
        help="Output format. Defaults to json.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.root).resolve()
    manifest_path = Path(args.manifest).resolve()

    try:
        clusters = load_manifest(manifest_path)
        rows = [inventory_cluster(repo_root, cluster) for cluster in clusters]
    except Exception as exc:  # pragma: no cover
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.format == "markdown":
        print(to_markdown(rows))
    else:
        print(json.dumps(rows, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
