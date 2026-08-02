#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


def split_words(value: str) -> list[str]:
    cleaned = re.sub(r"[^0-9A-Za-z]+", " ", value.strip())
    words: list[str] = []
    for token in cleaned.split():
        words.extend(
            re.findall(r"[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+", token)
        )
    return [word for word in words if word]


def base_symbol_name(symbol: str) -> str:
    for separator in ("::", ".", "#", "/"):
        if separator in symbol:
            symbol = symbol.split(separator)[-1]
    return symbol.strip()


def to_camel_case(symbol: str) -> str:
    words = split_words(base_symbol_name(symbol))
    if not words:
        raise ValueError(f"Unable to derive a callable name from: {symbol!r}")
    head = words[0].lower()
    tail = "".join(word[:1].upper() + word[1:].lower() for word in words[1:])
    return head + tail


def build_template(symbol_name: str, original_symbol: str, owner: str | None, kind: str) -> str:
    owner_line = f"- Owner: `{owner}`\n" if owner else ""
    return f"""# {symbol_name}

## Summary
One sentence describing what the callable does for callers.

## Symbol
- Name: `{symbol_name}`
- Original Symbol: `{original_symbol}`
- Kind: `{kind}`
{owner_line}
## Signature
```ts
{original_symbol}(/* params */)
```

## Location
- `path/to/source-file`

## Inputs
- Document each required and optional input that matters to callers.

## Returns
- Document the resolved or returned value shape.

## Errors
- Document thrown errors, error results, and validation failures.

## Preconditions
- Document auth, setup, and required state.

## Side Effects
- Document storage writes, network calls, events, cache changes, or mutations.

## Guarantees
- Document ordering, idempotency, persistence, or compatibility guarantees.

## Examples
- Add examples only when they clarify caller behavior.

## Source of Truth
- Implementation: `path/to/source-file`
- Tests: `path/to/test-file`
- Call sites: `path/to/call-site`
"""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scaffold a docs/contracts contract document for a callable."
    )
    parser.add_argument("symbol", help="Function or method name, optionally qualified")
    parser.add_argument(
        "--dir",
        default="docs/contracts",
        help="Output directory relative to the repo root or absolute path",
    )
    parser.add_argument("--owner", help="Optional owning type, module, or class name")
    parser.add_argument(
        "--kind",
        default="function",
        choices=("function", "method"),
        help="Callable kind to record in the stub",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite an existing file",
    )
    args = parser.parse_args()

    symbol_name = to_camel_case(args.symbol)
    output_dir = Path(args.dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{symbol_name}.md"

    if output_path.exists() and not args.force:
        print(output_path)
        return 0

    output_path.write_text(
        build_template(symbol_name, args.symbol, args.owner, args.kind),
        encoding="utf-8",
    )
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
