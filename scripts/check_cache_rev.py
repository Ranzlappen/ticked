#!/usr/bin/env python3
"""Warn if precached assets changed in a PR without a CACHE_REV bump.

Installed PWA users only pick up new shells when CACHE_REV (the revision
token on every precache entry) changes. Forgetting to bump it is the
single most common regression against installed users — this check pairs
a git diff against the SW file to catch it before merge.

Non-blocking: prints a GitHub Actions warning via ::warning::. Make it
fatal later if false positives stay low.
"""
from __future__ import annotations

import re
import subprocess
import sys

PRECACHED_FILES = {
    "index.html",
    "styles.css",
    "app.js",
    "i18n.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-192.png",
    "icon-maskable-512.png",
}
CACHE_REV_RE = re.compile(r"const\s+CACHE_REV\s*=\s*'([^']+)'")


def cmd(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()


def read_cache_rev_at(ref: str) -> str | None:
    try:
        source = cmd("git", "show", f"{ref}:sw.js")
    except subprocess.CalledProcessError:
        return None
    m = CACHE_REV_RE.search(source)
    return m.group(1) if m else None


def changed_files(base: str, head: str) -> set[str]:
    out = cmd("git", "diff", "--name-only", base, head)
    return {line.strip() for line in out.splitlines() if line.strip()}


def main(base: str, head: str) -> int:
    changed = changed_files(base, head)
    precached_changed = changed & PRECACHED_FILES
    sw_changed = "sw.js" in changed

    if not precached_changed:
        print("No precached assets changed — CACHE_REV bump not required.")
        return 0

    base_rev = read_cache_rev_at(base)
    head_rev = read_cache_rev_at(head)

    if base_rev != head_rev:
        print(
            f"CACHE_REV bumped: {base_rev!r} -> {head_rev!r}. "
            f"Precached files changed: {sorted(precached_changed)}"
        )
        return 0

    files = ", ".join(sorted(precached_changed))
    msg = (
        f"Precached assets changed ({files}) but CACHE_REV is unchanged "
        f"({base_rev!r}). Installed PWA users will keep serving the old shell "
        "until you bump CACHE_REV in sw.js (format: YYYYMMDD-N)."
    )
    # GitHub Actions workflow command — surfaces as a warning annotation on the PR.
    print(f"::warning file=sw.js::{msg}")
    # Also stdout so local runs see it clearly.
    print(f"WARNING: {msg}")
    return 0  # non-blocking for now


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: check_cache_rev.py <base_sha> <head_sha>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
