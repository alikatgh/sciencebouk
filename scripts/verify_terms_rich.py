#!/usr/bin/env python3
"""Verify terms.json entries have rich popup fields."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def has_rich(t: dict) -> bool:
    return bool(
        t.get("lead")
        and t.get("analogy")
        and isinstance(t.get("sections"), list)
        and len(t.get("sections", [])) >= 1
        and isinstance(t.get("confused"), list)
        and len(t.get("confused", [])) >= 1
    )


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: verify_terms_rich.py <terms.json> [min_count]")
        return 2
    path = Path(sys.argv[1])
    min_count = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    data = json.loads(path.read_text(encoding="utf-8"))
    terms = data.get("terms", {})
    rich = [k for k, v in terms.items() if has_rich(v)]
    print(f"total={len(terms)} rich={len(rich)}")
    if len(terms) < min_count:
        print(f"FAIL: count {len(terms)} < min {min_count}")
        return 1
    if len(rich) < min_count:
        missing = [k for k in terms if k not in rich][:10]
        print(f"FAIL: rich {len(rich)} < min {min_count}; sample missing: {missing}")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())