#!/usr/bin/env python3
"""Validate sw.js: CACHE_REV is well-formed and every precached URL resolves.

We deliberately avoid executing the service worker. Parsing the static
precacheAndRoute([...]) literal with a regex is fragile, but the SW shape
is well-known to this repo and checked into version control, so we lean on
it rather than adding a JS parser dependency.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

CACHE_REV_RE = re.compile(r"const\s+CACHE_REV\s*=\s*'([^']+)'")
ENTRY_RE = re.compile(r"\{\s*url:\s*'([^']+)'\s*,\s*revision:\s*([A-Z_][A-Z0-9_]*)")
YYYYMMDD_N_RE = re.compile(r"^\d{8}-\d+$")


def main(path: str) -> int:
    p = Path(path)
    if not p.exists():
        print(f"ERROR: {p} does not exist", file=sys.stderr)
        return 1

    source = p.read_text(encoding="utf-8")
    errors: list[str] = []

    m = CACHE_REV_RE.search(source)
    if not m:
        errors.append("CACHE_REV constant not found")
        cache_rev = None
    else:
        cache_rev = m.group(1)
        if not YYYYMMDD_N_RE.match(cache_rev):
            errors.append(
                f"CACHE_REV {cache_rev!r} does not match 'YYYYMMDD-N' format"
            )

    entries = ENTRY_RE.findall(source)
    if not entries:
        errors.append("no precache entries found in sw.js")

    for url, rev_token in entries:
        if rev_token != "CACHE_REV":
            errors.append(
                f"precache entry {url!r} uses revision={rev_token!r}; "
                "expected the shared CACHE_REV constant"
            )
        if url.startswith(("http://", "https://", "//", "data:")):
            continue
        # "./" refers to index.html at the app root — checked separately.
        if url in ("./", "/"):
            target = p.parent / "index.html"
        else:
            target = p.parent / url
        if not target.exists():
            errors.append(f"precache entry {url!r} not found on disk")

    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1

    print(
        f"OK: CACHE_REV={cache_rev}, {len(entries)} precache entries all resolve"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "sw.js"))
