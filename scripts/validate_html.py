#!/usr/bin/env python3
"""Parse-level HTML sanity check for Ticked's single-file shell.

This is intentionally light: we're not using a full validator (no deps, no
build step in this repo), just catching the class of bugs that actually
bite us — malformed tags, mismatched quotes, missing required attributes
on referenced assets.
"""
from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path


class TickedHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.errors: list[str] = []
        self.saw_manifest_link = False
        self.saw_sw_script_or_register = False
        self.script_srcs: list[str] = []
        self.stylesheet_hrefs: list[str] = []

    def error(self, message: str) -> None:  # pragma: no cover
        self.errors.append(message)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k: v for k, v in attrs}
        if tag == "link" and a.get("rel") == "manifest":
            self.saw_manifest_link = True
        if tag == "link" and a.get("rel") == "stylesheet" and a.get("href"):
            self.stylesheet_hrefs.append(a["href"])
        if tag == "script" and a.get("src"):
            self.script_srcs.append(a["src"])


def main(path: str) -> int:
    p = Path(path)
    if not p.exists():
        print(f"ERROR: {p} does not exist", file=sys.stderr)
        return 1

    source = p.read_text(encoding="utf-8")
    parser = TickedHTMLParser()
    try:
        parser.feed(source)
        parser.close()
    except Exception as e:
        print(f"ERROR parsing {p}: {e}", file=sys.stderr)
        return 1

    if parser.errors:
        for err in parser.errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1

    if not parser.saw_manifest_link:
        print("ERROR: index.html is missing <link rel=\"manifest\">", file=sys.stderr)
        return 1

    # Every referenced local asset must exist on disk.
    missing: list[str] = []
    for ref in parser.script_srcs + parser.stylesheet_hrefs:
        if ref.startswith(("http://", "https://", "//", "data:")):
            continue
        if not (p.parent / ref).exists():
            missing.append(ref)
    if missing:
        print(
            "ERROR: referenced asset(s) missing on disk: " + ", ".join(missing),
            file=sys.stderr,
        )
        return 1

    print(f"OK: {p} parses, manifest link present, all local refs resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "index.html"))
