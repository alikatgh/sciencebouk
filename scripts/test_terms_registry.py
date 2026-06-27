#!/usr/bin/env python3
"""Tests for terms registry rich coverage."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TERMS_JSON = ROOT / "docs" / "assets" / "terms.json"
VERIFY = ROOT / "scripts" / "verify_terms_rich.py"

MIN_SECTIONS = 3
MIN_CONFUSED = 3
MIN_ANALOGY = 60


def has_full_rich(t: dict) -> bool:
    analogy = t.get("analogy") or {}
    sections = t.get("sections") or []
    confused = t.get("confused") or []
    if not t.get("lead"):
        return False
    if len((analogy.get("body") or "").strip()) < MIN_ANALOGY:
        return False
    if len(sections) < MIN_SECTIONS:
        return False
    for s in sections:
        if not (s.get("heading") or s.get("title")) or not s.get("body"):
            return False
    if len(confused) < MIN_CONFUSED:
        return False
    return True


class TermsRegistryTest(unittest.TestCase):
    def test_terms_file_exists(self) -> None:
        self.assertTrue(TERMS_JSON.is_file(), f"missing {TERMS_JSON}")

    def test_all_terms_rich(self) -> None:
        data = json.loads(TERMS_JSON.read_text(encoding="utf-8"))
        terms = data["terms"]
        self.assertGreaterEqual(len(terms), 50)
        missing = [k for k, v in terms.items() if not has_full_rich(v)]
        self.assertEqual(missing, [], f"non-rich terms sample: {missing[:5]}")

    def test_key_terms_present(self) -> None:
        data = json.loads(TERMS_JSON.read_text(encoding="utf-8"))
        terms = data["terms"]
        for key in ("hypotenuse", "pythagoras-s-theorem", "logarithms", "derivative"):
            if key in terms:
                self.assertTrue(has_full_rich(terms[key]), key)

    def test_verify_script_passes(self) -> None:
        proc = subprocess.run(
            [sys.executable, str(VERIFY), str(TERMS_JSON), "50"],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)


if __name__ == "__main__":
    unittest.main()