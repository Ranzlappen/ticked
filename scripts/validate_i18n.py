#!/usr/bin/env python3
"""Validate i18n.js: every language dictionary has the same keys, and every
string-literal key referenced from the app resolves to a real entry.

We deliberately avoid executing JavaScript. The dictionaries are a known,
checked-in shape (`en: { ... }, es: { ... }, ...`), so we brace-match each
language block and pull its top-level keys with a small hand-rolled scanner
that understands JS string literals (so colons/braces inside values such as
"Aujourd'hui" or "Tags:" don't get mistaken for keys).

Usage: validate_i18n.py [i18n.js] [reference_glob_root]
The reference root defaults to the repo root (parent of scripts/).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

LANGS = ("en", "es", "de", "fr")

# t('key') / t("key")  — only literal first args; dynamic keys are skipped.
T_CALL_RE = re.compile(r"""\bt\(\s*(['"])([A-Za-z0-9_]+)\1""")
# data-i18n / data-i18n-placeholder / data-i18n-title / data-i18n-aria-label / data-i18n-html
DATA_I18N_RE = re.compile(r"""data-i18n(?:-[a-z-]+)?\s*=\s*(['"])([A-Za-z0-9_]+)\1""")


def _find_block(source: str, lang: str) -> str | None:
    """Return the raw body (between the outer braces) of `lang: { ... }`."""
    m = re.search(r"(?:^|[^A-Za-z0-9_])" + lang + r"\s*:\s*\{", source)
    if not m:
        return None
    start = source.index("{", m.start())
    depth = 0
    for i in range(start, len(source)):
        c = source[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return source[start + 1 : i]
    return None


def _top_level_keys(body: str) -> list[str]:
    """Extract identifier/quoted keys that sit at brace-depth 0 in `body`,
    skipping anything inside string literals."""
    keys: list[str] = []
    depth = 0
    i = 0
    n = len(body)
    expect_key = True  # at depth 0, are we at a position where a key can start?
    while i < n:
        c = body[i]
        if c in "\"'`":
            quote = c
            i += 1
            while i < n:
                if body[i] == "\\":
                    i += 2
                    continue
                if body[i] == quote:
                    break
                i += 1
            i += 1
            continue
        if c in "{[(":
            depth += 1
            i += 1
            continue
        if c in "}])":
            depth -= 1
            i += 1
            continue
        if c == "," and depth == 0:
            expect_key = True
            i += 1
            continue
        if depth == 0 and expect_key and (c.isalpha() or c == "_"):
            m = re.match(r"[A-Za-z0-9_]+\s*:", body[i:])
            if m:
                keys.append(m.group(0).rstrip(": \t\r\n"))
                expect_key = False
                i += m.end()
                continue
        if not c.isspace():
            expect_key = False
        i += 1
    return keys


def main(i18n_path: str, ref_root: str | None) -> int:
    p = Path(i18n_path)
    if not p.exists():
        print(f"ERROR: {p} does not exist", file=sys.stderr)
        return 1
    source = p.read_text(encoding="utf-8")
    errors: list[str] = []

    keysets: dict[str, list[str]] = {}
    for lang in LANGS:
        body = _find_block(source, lang)
        if body is None:
            errors.append(f"language block {lang!r} not found")
            continue
        keys = _top_level_keys(body)
        dupes = sorted({k for k in keys if keys.count(k) > 1})
        if dupes:
            errors.append(f"[{lang}] duplicate keys: {', '.join(dupes)}")
        keysets[lang] = keys

    if "en" in keysets:
        en = set(keysets["en"])
        for lang in LANGS:
            if lang == "en" or lang not in keysets:
                continue
            other = set(keysets[lang])
            missing = sorted(en - other)
            extra = sorted(other - en)
            if missing:
                errors.append(f"[{lang}] missing keys vs en: {', '.join(missing)}")
            if extra:
                errors.append(f"[{lang}] extra keys not in en: {', '.join(extra)}")

    # Cross-check literal references in app source resolve to a real key.
    if "en" in keysets and not errors:
        root = Path(ref_root) if ref_root else p.parent
        referenced: set[str] = set()
        files = [root / "index.html", *sorted((root / "js").glob("*.js"))]
        for f in files:
            if not f.exists():
                continue
            text = f.read_text(encoding="utf-8")
            for m in T_CALL_RE.finditer(text):
                referenced.add(m.group(2))
            for m in DATA_I18N_RE.finditer(text):
                referenced.add(m.group(2))
        unknown = sorted(referenced - set(keysets["en"]))
        if unknown:
            errors.append(
                "referenced i18n keys with no dictionary entry: "
                + ", ".join(unknown)
            )

    if errors:
        for err in errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1

    count = len(keysets.get("en", []))
    print(f"OK: {len(LANGS)} dictionaries in parity ({count} keys each)")
    return 0


if __name__ == "__main__":
    arg1 = sys.argv[1] if len(sys.argv) > 1 else "i18n.js"
    arg2 = sys.argv[2] if len(sys.argv) > 2 else None
    sys.exit(main(arg1, arg2))
