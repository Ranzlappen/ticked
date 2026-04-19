#!/usr/bin/env python3
"""Validate manifest.json parses, has required fields, and every icon resolves."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED_FIELDS = ("name", "start_url", "scope", "id", "display", "icons")
EXPECTED_IDENTITY = {"start_url": "./", "scope": "./", "id": "./"}


def main(path: str) -> int:
    p = Path(path)
    if not p.exists():
        print(f"ERROR: {p} does not exist", file=sys.stderr)
        return 1

    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"ERROR: {p} is not valid JSON: {e}", file=sys.stderr)
        return 1

    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    # Installed-user safety: start_url / scope / id must stay at './'.
    for k, v in EXPECTED_IDENTITY.items():
        if data.get(k) != v:
            errors.append(
                f"identity field {k!r} is {data.get(k)!r}, expected {v!r} "
                "(changing this invalidates every installed PWA)"
            )

    icons = data.get("icons", [])
    if not isinstance(icons, list) or not icons:
        errors.append("icons[] must be a non-empty list")
    else:
        for i, icon in enumerate(icons):
            src = icon.get("src") if isinstance(icon, dict) else None
            if not src:
                errors.append(f"icons[{i}] missing src")
                continue
            if not (p.parent / src).exists():
                errors.append(f"icons[{i}] src {src!r} not found on disk")

    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1

    print(f"OK: {p} valid, identity fields unchanged, {len(icons)} icon(s) resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "manifest.json"))
