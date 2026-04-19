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

CACHE_REV_RE = re.compile(r"const\s+CACHE_REV\s*=\s*'([^']+)'")
PRECACHE_URL_RE = re.compile(r"\{\s*url:\s*'([^']+)'\s*,\s*revision:")


def cmd(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()


def read_sw_at(ref: str) -> str | None:
    try:
        return cmd("git", "show", f"{ref}:sw.js")
    except subprocess.CalledProcessError:
        return None


def extract_cache_rev(source: str) -> str | None:
    m = CACHE_REV_RE.search(source)
    return m.group(1) if m else None


def extract_precache_paths(source: str) -> set[str]:
    """URLs listed in precacheAndRoute(), filtered to repo-relative paths.

    Skips './' (the app root, aliased to index.html) since it can't be matched
    against a file diff path. Also skips anything absolute or protocol-scheme,
    though the current sw.js shape doesn't use those.
    """
    paths: set[str] = set()
    for url in PRECACHE_URL_RE.findall(source):
        if url in ("./", "/") or url.startswith(("http://", "https://", "//", "data:")):
            continue
        paths.add(url)
    return paths


def changed_files(base: str, head: str) -> set[str] | None:
    """Return files changed between base..head, or None if git can't compare them.

    Returns None (not raises) on any git failure — this check is advisory, and
    a missing ref in CI shouldn't fail the whole job. The hard validators
    (validate_html / validate_manifest / validate_sw) are the real gates.
    """
    try:
        out = cmd("git", "diff", "--name-only", base, head)
    except subprocess.CalledProcessError:
        return None
    return {line.strip() for line in out.splitlines() if line.strip()}


def main(base: str, head: str) -> int:
    changed = changed_files(base, head)
    head_sw = read_sw_at(head)
    if changed is None or head_sw is None:
        msg = (
            f"Could not diff {base[:7]}..{head[:7]} — skipping CACHE_REV check. "
            "Ensure actions/checkout fetches both refs (fetch-depth: 0)."
        )
        print(f"::warning file=sw.js::{msg}")
        print(f"WARNING: {msg}")
        return 0

    # Read precache paths from the HEAD sw.js — this stays correct across
    # layout refactors (e.g. when app.js becomes js/*.js) without edits here.
    precached = extract_precache_paths(head_sw)
    precached_changed = changed & precached

    if not precached_changed:
        print("No precached assets changed — CACHE_REV bump not required.")
        return 0

    base_sw = read_sw_at(base)
    base_rev = extract_cache_rev(base_sw) if base_sw else None
    head_rev = extract_cache_rev(head_sw)

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
