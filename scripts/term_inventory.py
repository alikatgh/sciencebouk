#!/usr/bin/env python3
"""Pure term inventory: glossary + bullets + filtered prose candidates → manifest."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_terms_registry import (  # noqa: E402
    parse_frontend_data,
    parse_glossary_bullets,
    parse_glossary_h3,
    parse_lesson_bullets,
    slug,
)
from test_terms_common import is_junk_id  # noqa: E402

BOLD_RE = re.compile(r"\*\*([^*]{2,80})\*\*")
CODE_TERM_RE = re.compile(r"`([a-zA-Z_][a-zA-Z0-9_.]{2,48})`")

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "go",
    "he", "her", "him", "his", "if", "in", "is", "it", "its", "me", "my", "no",
    "not", "of", "on", "or", "our", "she", "so", "the", "their", "them", "then",
    "there", "these", "they", "this", "to", "up", "us", "was", "we", "when",
    "who", "why", "will", "with", "you", "your", "all", "any", "can", "had",
    "has", "have", "how", "into", "just", "like", "may", "more", "most", "new",
    "now", "old", "one", "only", "other", "out", "over", "same", "see", "some",
    "such", "than", "that", "them", "too", "two", "use", "very", "what", "which",
    "while", "work", "yes", "yet", "each", "make", "made", "here", "also", "both",
    "part", "step", "steps", "note", "tips", "try", "read", "open", "file",
    "files", "line", "lines", "code", "list", "table", "figure", "summary",
    "objectives", "reveal", "warning", "tip", "example", "examples", "result",
    "results", "output", "input", "type", "types", "name", "names", "value",
    "values", "true", "false", "null", "none", "first", "second", "third",
    "next", "last", "left", "right", "top", "bottom", "less", "many", "much",
    "few", "every", "whole", "full", "half", "way", "bg", "dt", "fn", "fw",
    "gs", "h1", "h2", "h3", "id", "iq", "ui", "ux", "fr", "f6", "f7", "f8", "f9",
    "after", "before", "during", "then", "next", "where", "between", "because",
    "through", "within", "without", "again", "once",
}

SKIP_BOLD = {
    "Objectives", "Why it matters", "Try it", "Check yourself", "Simple analogy",
    "What it actually means", "The mental model", "Where you see it",
    "Predict before reading", "Still not clear?", "Part A", "Part B", "Part C",
    "Note", "Warning", "Tip", "Reveal", "Summary", "Table", "Figure",
}

COMPARATIVE_RE = re.compile(
    r"\b(taller|shorter|wider|narrower|longer|bigger|smaller|faster|slower)\s+than\b",
    re.I,
)


def is_stopword(label: str, tid: str) -> bool:
    low = label.lower().strip()
    if low in STOPWORDS or tid in STOPWORDS:
        return True
    if is_junk_id(tid):
        return True
    return False


def reject_prose_label(label: str, tid: str) -> str | None:
    """Return rejection reason, or None if label may be approved."""
    if is_stopword(label, tid):
        return "stopword"
    if label in SKIP_BOLD:
        return "section_heading"
    if label.lower() in {"after", "before", "during", "then", "next", "finally"}:
        return "temporal_fragment"
    if re.fullmatch(r"[A-Za-z]\d+", label) or re.fullmatch(r"[a-z]\d+", tid):
        return "var_placeholder"
    if tid in {"eq", "fn"}:
        return "abbrev_placeholder"
    if re.search(r"[<×>≥≤]", label):
        return "measurement_or_symbol"
    if re.match(r"^\s*\d", label) or re.match(r"^\d", tid):
        return "leading_digit"
    if COMPARATIVE_RE.search(label):
        return "comparative_fragment"
    if re.search(r"\d+\s*(?:ms|sec|seconds?|px|pt|em|rem|%|×)\b", label, re.I):
        return "numeric_measurement"
    if re.search(r"^\d+[-.]\d+", label) or re.search(r"^\d+[-.]\d+", tid):
        return "numeric_slug"
    if len(label) > 60:
        return "too_long"
    if not is_technical_label(label):
        return "not_technical"
    return None


def is_technical_label(label: str) -> bool:
    if is_stopword(label, slug(label)):
        return False
    if label in SKIP_BOLD:
        return False
    if re.search(r"[_.\\/]", label):
        return True
    if re.search(r"[A-Z]{2,}", label):
        return True
    if re.search(r"[A-Z][a-z]+[A-Z]", label):
        return True
    if "`" in label:
        return True
    if label.startswith("src/") or label.startswith("http"):
        return False
    words = re.findall(r"[A-Za-z]+", label)
    if len(words) >= 2 and any(w[0].isupper() for w in words[1:]):
        return True
    if len(label) >= 5 and re.search(r"[-_]", label):
        return True
    if len(label) >= 6 and label[0].isupper():
        return True
    return False


def collect_glossary_ids(glossaries: list[Path]) -> set[str]:
    ids: set[str] = set()
    for gpath in glossaries:
        if not gpath.exists():
            continue
        gtext = gpath.read_text(encoding="utf-8", errors="replace")
        if "### " in gtext:
            ids.update(parse_glossary_h3(gtext).keys())
        if re.search(r"^- \*\*", gtext, re.MULTILINE):
            ids.update(parse_glossary_bullets(gtext).keys())
    return ids


def collect_bullet_ids(lessons_dirs: list[Path]) -> set[str]:
    return set(parse_lesson_bullets(lessons_dirs).keys())


def collect_frontend_ids(frontend_data: Path | None) -> set[str]:
    if not frontend_data:
        return set()
    return set(parse_frontend_data(frontend_data).keys())


def scan_prose_candidates(
    lessons_dirs: list[Path],
    known: set[str],
) -> tuple[dict[str, dict], list[dict]]:
    """Return (approved_entries, rejected_records)."""
    approved: dict[str, dict] = {}
    rejected: list[dict] = []
    seen_reject: set[str] = set()

    for lessons_dir in lessons_dirs:
        if not lessons_dir.exists():
            continue
        for path in sorted(lessons_dir.rglob("*.md")):
            if path.name in ("index.md", "glossary.md", "README.md"):
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            body = text.split("## Part", 1)[-1] if "## Part" in text else text

            for m in BOLD_RE.finditer(body):
                label = m.group(1).strip()
                tid = slug(label)
                if not tid or tid in known or tid in approved:
                    continue
                reason = reject_prose_label(label, tid)
                if reason:
                    if tid not in seen_reject:
                        rejected.append({"id": tid, "label": label, "reason": reason, "source": path.name})
                        seen_reject.add(tid)
                    continue
                approved[tid] = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "source_lesson": path.name,
                }

            for m in CODE_TERM_RE.finditer(body):
                label = m.group(1)
                tid = slug(label)
                if not tid or tid in known or tid in approved:
                    continue
                if not re.search(r"[_.]", label) and not label[0].isupper():
                    continue
                reason = reject_prose_label(label, tid)
                if reason:
                    if tid not in seen_reject:
                        rejected.append({"id": tid, "label": label, "reason": reason, "source": path.name})
                        seen_reject.add(tid)
                    continue
                approved[tid] = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "source_lesson": path.name,
                }

    return approved, rejected


def load_handcrafted_ids(seed_path: Path | None) -> set[str]:
    if not seed_path or not seed_path.exists():
        return set()
    data = json.loads(seed_path.read_text(encoding="utf-8"))
    return set(data.get("terms", {}).keys())


def build_inventory(
    glossaries: list[Path],
    lessons_dirs: list[Path],
    frontend_data: Path | None = None,
    handcrafted_seed: Path | None = None,
) -> dict:
    glossary_ids = collect_glossary_ids(glossaries)
    bullet_ids = collect_bullet_ids(lessons_dirs)
    frontend_ids = collect_frontend_ids(frontend_data)
    required = sorted(glossary_ids | bullet_ids | frontend_ids)

    known = set(required)
    prose_entries, rejected = scan_prose_candidates(lessons_dirs, known)
    prose_approved = sorted(prose_entries.keys())

    handcrafted = sorted(load_handcrafted_ids(handcrafted_seed))
    prose_approved = [tid for tid in prose_approved if not is_junk_id(tid)]
    required = [tid for tid in required if not is_junk_id(tid)]
    all_ids = sorted(
        tid for tid in set(required) | set(prose_approved) | set(handcrafted) if not is_junk_id(tid)
    )

    return {
        "version": 1,
        "required": required,
        "prose_approved": prose_approved,
        "handcrafted": handcrafted,
        "all_ids": all_ids,
        "counts": {
            "glossary": len(glossary_ids),
            "bullets": len(bullet_ids),
            "frontend": len(frontend_ids),
            "required": len(required),
            "prose_approved": len(prose_approved),
            "prose_rejected": len(rejected),
            "handcrafted": len(handcrafted),
            "all": len(all_ids),
        },
        "prose_rejected": rejected,
    }


def write_manifest(inv: dict, manifest_path: Path, rejected_path: Path | None = None) -> None:
    manifest = {k: v for k, v in inv.items() if k != "prose_rejected"}
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if rejected_path:
        rejected_path.write_text(
            json.dumps({"version": 1, "rejected": inv.get("prose_rejected", [])}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    c = inv["counts"]
    print(
        f"Manifest: required={c['required']} prose_approved={c['prose_approved']} "
        f"rejected={c['prose_rejected']} all={c['all']} → {manifest_path}"
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default="")
    ap.add_argument("--glossary", action="append", default=[], type=Path)
    ap.add_argument("--lessons", action="append", default=[], type=Path)
    ap.add_argument("--frontend-data", type=Path, default=None)
    ap.add_argument("--handcrafted-seed", type=Path, default=None)
    ap.add_argument("--manifest-out", type=Path, required=True)
    ap.add_argument("--rejected-out", type=Path, default=None)
    args = ap.parse_args()

    inv = build_inventory(args.glossary, args.lessons, args.frontend_data, args.handcrafted_seed)
    if args.project:
        inv["project"] = args.project
    write_manifest(inv, args.manifest_out, args.rejected_out)
    return 0


if __name__ == "__main__":
    sys.exit(main())