#!/usr/bin/env python3
"""Shared assertions for terms registry + manifest tests."""

from __future__ import annotations

import json
from pathlib import Path

MIN_SECTIONS = 3
MIN_CONFUSED = 3
MIN_ANALOGY = 60

STOPWORD_IDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "go",
    "he", "her", "him", "his", "if", "in", "is", "it", "its", "me", "my", "no",
    "not", "of", "on", "or", "our", "she", "so", "the", "their", "them", "then",
    "there", "these", "they", "this", "to", "up", "us", "was", "we", "when",
    "who", "why", "will", "with", "you", "your", "all", "any", "can", "had",
    "has", "have", "how", "into", "just", "like", "may", "more", "most", "new",
    "now", "old", "one", "only", "other", "out", "over", "same", "see", "some",
    "such", "than", "that", "too", "two", "use", "very", "what", "which",
    "while", "yes", "yet", "h1", "h2", "h3", "dt", "dd", "li", "ul", "ol",
    "div", "span", "href", "src", "alt", "after", "before", "between", "where",
    "during", "then", "next", "because", "through", "within", "without",
})

JUNK_SLUG_RE = __import__("re").compile(r"^\d+([.-]\d+)*$")
VAR_PLACEHOLDER_RE = __import__("re").compile(r"^[a-z]\d+$")


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
    for c in confused:
        if isinstance(c, str):
            if not c.strip():
                return False
        elif not c.get("term"):
            return False
    return True


def load_manifest(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_terms(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))["terms"]


def load_seed(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8")).get("terms", {})


def is_junk_id(tid: str) -> bool:
    if tid in STOPWORD_IDS:
        return True
    if JUNK_SLUG_RE.fullmatch(tid):
        return True
    if VAR_PLACEHOLDER_RE.fullmatch(tid):
        return True
    if tid in {"eq", "fn", "id", "ui", "ux", "bg", "dt"}:
        return True
    if len(tid) <= 2 and tid.isalpha():
        return True
    return False


def hand_authored_body(entry: dict) -> str:
    return (entry.get("analogy") or {}).get("body", "")