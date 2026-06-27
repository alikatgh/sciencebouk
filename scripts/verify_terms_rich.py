#!/usr/bin/env python3
"""Verify every term in terms.json has full rich popup schema."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_terms_common import has_full_rich, is_junk_id  # noqa: E402


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: verify_terms_rich.py <terms.json> [sample_size]", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    sample = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    data = json.loads(path.read_text(encoding="utf-8"))
    terms = data.get("terms") or data
    if isinstance(terms, dict) and "terms" in terms:
        terms = terms["terms"]

    ids = list(terms.keys())
    junk = [tid for tid in ids if is_junk_id(tid)]
    incomplete = [tid for tid in ids if not has_full_rich(terms[tid])]

    print(f"Total terms: {len(ids)}")
    print(f"Junk/stopword ids: {len(junk)}")
    if junk[:10]:
        print(f"  examples: {junk[:10]}")
    print(f"Incomplete rich: {len(incomplete)}")
    if incomplete[:15]:
        print(f"  examples: {incomplete[:15]}")

    if sample > 0:
        import random
        random.seed(42)
        pick = random.sample(ids, min(sample, len(ids)))
        bad_sample = [t for t in pick if not has_full_rich(terms[t])]
        print(f"Random sample {len(pick)}: incomplete {len(bad_sample)}")

    if junk or incomplete:
        return 1
    print("OK: all terms have full rich schema")
    return 0


if __name__ == "__main__":
    sys.exit(main())