#!/usr/bin/env python3
"""Tests for terms registry rich coverage + manifest contract."""

from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TERMS_JSON = ROOT / "docs" / "assets" / "terms.json"
MANIFEST_JSON = ROOT / "docs" / "assets" / "term-manifest.json"
SEED_JSON = ROOT / "docs" / "assets" / "terms-handcrafted-seed.json"
VERIFY = ROOT / "scripts" / "verify_terms_rich.py"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_terms_common import has_full_rich, is_junk_id, load_manifest, load_seed, load_terms


class TermsRegistryTest(unittest.TestCase):
    def test_terms_and_manifest_exist(self) -> None:
        self.assertTrue(TERMS_JSON.is_file())
        self.assertTrue(MANIFEST_JSON.is_file())

    def test_all_terms_rich(self) -> None:
        terms = load_terms(TERMS_JSON)
        self.assertGreaterEqual(len(terms), 50)
        missing = [k for k, v in terms.items() if not has_full_rich(v)]
        self.assertEqual(missing, [], f"sample: {missing[:5]}")

    def test_required_terms_present(self) -> None:
        manifest = load_manifest(MANIFEST_JSON)
        terms = load_terms(TERMS_JSON)
        for tid in manifest["required"]:
            self.assertIn(tid, terms)
            self.assertTrue(has_full_rich(terms[tid]), tid)

    def test_no_unlisted_ids(self) -> None:
        manifest = load_manifest(MANIFEST_JSON)
        terms = load_terms(TERMS_JSON)
        extra = sorted(set(terms.keys()) - set(manifest["all_ids"]))
        self.assertEqual(extra, [], f"sample: {extra[:5]}")

    def test_no_junk_ids(self) -> None:
        terms = load_terms(TERMS_JSON)
        junk = [k for k in terms if is_junk_id(k)]
        self.assertEqual(junk, [], f"sample: {junk[:5]}")

    def test_handcrafted_preserved(self) -> None:
        seed = load_seed(SEED_JSON)
        if not seed:
            return
        terms = load_terms(TERMS_JSON)
        for tid, seed_entry in seed.items():
            self.assertEqual(terms[tid]["analogy"]["body"], seed_entry["analogy"]["body"], tid)

    def test_verify_script_passes(self) -> None:
        proc = subprocess.run(
            [sys.executable, str(VERIFY), str(TERMS_JSON), "50"],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)


if __name__ == "__main__":
    unittest.main()