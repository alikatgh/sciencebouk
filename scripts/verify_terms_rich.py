#!/usr/bin/env python3
"""Verify every term in terms.json has full rich popup schema."""
from __future__ import annotations

import json
import sys
from pathlib import Path

MIN_SECTIONS = 3
MIN_CONFUSED = 3
MIN_ANALOGY = 60

# Plain English / markup noise — not curated glossary ids
STOPWORDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "go",
    "he", "her", "him", "his", "if", "in", "is", "it", "its", "me", "my", "no",
    "not", "of", "on", "or", "our", "she", "so", "the", "their", "them", "then",
    "there", "these", "they", "this", "to", "up", "us", "was", "we", "when",
    "who", "why", "will", "with", "you", "your", "all", "any", "can", "had",
    "has", "have", "how", "into", "just", "like", "may", "more", "most", "new",
    "now", "old", "one", "only", "other", "out", "over", "same", "see", "some",
    "such", "than", "that", "too", "two", "use", "very", "what", "which",
    "while", "yes", "yet", "each", "make", "made", "here", "also", "both",
    "does", "done", "even", "back", "been", "before", "after", "being", "between",
    "could", "should", "would", "about", "above", "below", "under", "again",
    "once", "where", "because", "through", "during", "without", "within",
    "part", "note", "tips", "files", "line", "lines", "list", "figure", "summary",
    "objectives", "reveal",
    "warning", "tip", "example", "examples", "result", "results", "output",
    "input", "name", "names", "value", "values", "true", "false", "null", "none",
    "first", "second", "third", "next", "last", "left", "right", "top", "bottom",
    "less", "many", "much", "few", "every", "whole", "full", "half", "way",
    "bg", "dt", "fn", "fw", "gs", "h1", "h2", "h3", "id", "iq", "ui", "ux",
    "fr", "f6", "f7", "f8", "f9", "div", "span", "href", "src", "alt", "li",
    "ul", "ol", "pre", "thead", "tbody", "tr", "td", "th", "img", "nav",
})


def has_full_rich(entry: dict) -> bool:
    if not entry.get("lead"):
        return False
    analogy = entry.get("analogy") or {}
    if not analogy.get("title") or len((analogy.get("body") or "").strip()) < MIN_ANALOGY:
        return False
    sections = entry.get("sections") or []
    if len(sections) < MIN_SECTIONS:
        return False
    for s in sections:
        if not (s.get("heading") or s.get("title")) or not s.get("body"):
            return False
    confused = entry.get("confused") or []
    if len(confused) < MIN_CONFUSED:
        return False
    for c in confused:
        if isinstance(c, str):
            if not c.strip():
                return False
        elif not c.get("term"):
            return False
    return True


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
    junk = [tid for tid in ids if tid.lower() in STOPWORDS]
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