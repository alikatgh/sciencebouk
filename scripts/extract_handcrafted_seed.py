#!/usr/bin/env python3
"""Extract hand-authored rich entries into terms-handcrafted-seed.json.

Used before manifest regen so seed ids always win in generate_terms_rich.py.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_terms_rich import is_hand_authored  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rich", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--merge", type=Path, default=None, help="existing seed to preserve")
    args = ap.parse_args()

    terms: dict = {}
    if args.merge and args.merge.exists():
        terms.update(json.loads(args.merge.read_text(encoding="utf-8")).get("terms", {}))

    if args.rich.exists():
        for k, v in json.loads(args.rich.read_text(encoding="utf-8")).get("terms", {}).items():
            if is_hand_authored(v):
                terms[k] = v

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps({"version": 1, "terms": terms}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(terms)} hand-authored entries → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())