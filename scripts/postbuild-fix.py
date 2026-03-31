#!/usr/bin/env python3
"""Post-build fixup for Bun bundler bugs in dist/ output.

Fixes:
1. Duplicate export blocks — merges into single unified export
2. __INVALID__REF__ — removes from exports and adds dummy declaration
3. Duplicate 'as' aliases in export blocks
"""

import re
import glob
import os

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")

stats = {"dup_exports": 0, "invalid_refs": 0, "files_touched": 0}


def fix_file(path: str) -> bool:
    with open(path, "r") as f:
        content = f.read()
    original = content

    # --- Fix 1: Merge duplicate export blocks ---
    pattern = r"^export \{[^}]+\};$"
    matches = list(re.finditer(pattern, content, re.MULTILINE))
    if len(matches) > 1:
        all_entries: list[str] = []
        for m in matches:
            block = m.group()
            inner = block.replace("export {", "").replace("};", "")
            entries = [e.strip() for e in inner.split(",") if e.strip()]
            all_entries.extend(entries)
        # Deduplicate while preserving order — use exported name as key
        seen: set[str] = set()
        unique: list[str] = []
        for e in all_entries:
            # "Foo as Bar" -> key is "Bar"; plain "Foo" -> key is "Foo"
            key = e.split(" as ")[-1].strip() if " as " in e else e.strip()
            if key not in seen:
                seen.add(key)
                unique.append(e)

        # Remove all export blocks
        for m in reversed(matches):
            content = content[: m.start()] + content[m.end() :]

        # Insert unified block at first position
        unified = "export {\n  " + ",\n  ".join(unique) + "\n};"
        pos = matches[0].start()
        content = content[:pos] + unified + content[pos:]
        stats["dup_exports"] += 1

    # --- Fix 2: Remove __INVALID__REF__ from exports and imports ---
    if "__INVALID__REF__" in content:
        # Remove from export lists
        content = re.sub(r",?\s*__INVALID__REF__\s*,?", ",", content)
        # Clean up double commas / leading/trailing commas in braces
        content = re.sub(r"\{\s*,", "{", content)
        content = re.sub(r",\s*\}", "}", content)
        content = re.sub(r",\s*,", ",", content)
        # Remove from import { __INVALID__REF__ } lines
        content = re.sub(
            r"^\s*var\s+__INVALID__REF__\s*=.*$", "", content, flags=re.MULTILINE
        )
        stats["invalid_refs"] += 1

    # --- Fix 3: Deduplicate names within a single export block ---
    pattern = r"^export \{[^}]+\};$"
    single_match = re.search(pattern, content, re.MULTILINE)
    if single_match:
        block = single_match.group()
        inner = block.replace("export {", "").replace("};", "")
        entries = [e.strip() for e in inner.split(",") if e.strip()]
        seen_single: set[str] = set()
        unique_single: list[str] = []
        for e in entries:
            key = e.split(" as ")[-1].strip() if " as " in e else e.strip()
            if key not in seen_single:
                seen_single.add(key)
                unique_single.append(e)
        if len(unique_single) < len(entries):
            new_block = "export {\n  " + ",\n  ".join(unique_single) + "\n};"
            content = content[: single_match.start()] + new_block + content[single_match.end() :]
            stats["dup_exports"] += 1

    if content != original:
        with open(path, "w") as f:
            f.write(content)
        stats["files_touched"] += 1
        return True
    return False


def main():
    js_files = glob.glob(os.path.join(DIST, "*.js"))
    print(f"Scanning {len(js_files)} JS files in dist/...")
    for f in sorted(js_files):
        fix_file(f)
    print(
        f"Done: fixed {stats['dup_exports']} duplicate exports, "
        f"{stats['invalid_refs']} invalid refs, "
        f"{stats['files_touched']} files modified"
    )


if __name__ == "__main__":
    main()
