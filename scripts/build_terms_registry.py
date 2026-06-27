#!/usr/bin/env python3
"""Build assets/terms.json from glossary + lesson plain-English bullets + terms-rich.json."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

BULLET_RE = re.compile(
    r"^- \*\*([^*]+)\*\*\s*(?:=\s*\"([^\"]+)\"|—\s*(.+?))\s*$",
    re.MULTILINE,
)
GLOSSARY_H3_RE = re.compile(r"^### (.+)$", re.MULTILINE)
GLOSSARY_LIST_RE = re.compile(
    r"^- \*\*([^*]+)\*\*\s*—\s*(.+?)(?:\s*\*\([^)]+\)\*)?\s*$",
    re.MULTILINE,
)


def slug(label: str) -> str:
    s = label.lower().strip()
    s = re.sub(r"[`'\"]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


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
    "div", "span", "href", "src", "alt",
})


def is_junk_term(tid: str, label: str = "") -> bool:
    low = (label or tid).lower().strip()
    if tid in STOPWORD_IDS or low in STOPWORD_IDS:
        return True
    if re.fullmatch(r"\d+([.-]\d+)*", low):
        return True
    if re.fullmatch(r"[a-z]{1,2}", low):
        return True
    return False


def parse_glossary_h3(text: str) -> dict[str, dict]:
    terms: dict[str, dict] = {}
    parts = GLOSSARY_H3_RE.split(text)
    it = iter(parts[1:])
    for title, body in zip(it, it):
        title = title.strip()
        body = body.strip()
        if not title:
            continue
        first = body.split("\n\n")[0].replace("\n", " ").strip()
        first = re.sub(r"\*Where:.*", "", first).strip()
        tid = slug(title)
        terms[tid] = {
            "id": tid,
            "label": title,
            "title": title,
            "short": first[:500] if first else "",
            "lead": first[:280] if first else f"What “{title}” means in this codebase.",
        }
    return terms


def parse_glossary_bullets(text: str) -> dict[str, dict]:
    terms: dict[str, dict] = {}
    for m in GLOSSARY_LIST_RE.finditer(text):
        raw_label = m.group(1).strip()
        desc = m.group(2).strip()
        chunks = re.split(r"\s*\*\*([^*]+)\*\*\s*—\s*", " " + raw_label + " — " + desc)
        if len(chunks) > 2:
            lead_desc = chunks[-1].strip()
            for i in range(1, len(chunks) - 1, 2):
                label = chunks[i].strip()
                tid = slug(label)
                terms[tid] = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "short": lead_desc[:400],
                    "lead": lead_desc[:280],
                }
        else:
            tid = slug(raw_label)
            terms[tid] = {
                "id": tid,
                "label": raw_label,
                "title": raw_label,
                "short": desc[:400],
                "lead": desc[:280],
            }
    return terms


def parse_lesson_bullets(lessons_dirs: list[Path]) -> dict[str, dict]:
    terms: dict[str, dict] = {}
    skip_names = {"index.md", "glossary.md", "README.md"}
    for lessons_dir in lessons_dirs:
        if not lessons_dir.exists():
            continue
        paths = list(lessons_dir.glob("*.md")) + list(lessons_dir.rglob("**/*.md"))
        seen: set[Path] = set()
        for path in sorted(paths):
            if path in seen or path.name in skip_names:
                continue
            seen.add(path)
            text = path.read_text(encoding="utf-8", errors="replace")
            if "What this actually means" not in text:
                continue
            block = text.split("What this actually means", 1)[-1]
            block = block.split("##", 1)[0]
            for m in BULLET_RE.finditer(block):
                label = m.group(1).strip().strip("`")
                quote = (m.group(2) or m.group(3) or "").strip().rstrip(".")
                tid = slug(label)
                entry = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "short": quote,
                    "lead": f"{label} means: {quote}" if quote else f"What “{label}” means in this course.",
                }
                if tid not in terms or len(quote) > len(terms[tid].get("short", "")):
                    terms[tid] = entry
    return terms


VAR_MEANING_RE = re.compile(
    r'\{\s*symbol:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*meaning:\s*"([^"]+)"',
)



def parse_equations_json(path: Path) -> dict[str, dict]:
    terms: dict[str, dict] = {}
    if not path.exists():
        return terms
    data = json.loads(path.read_text(encoding="utf-8"))
    for eq in data:
        title = (eq.get("title") or "").strip()
        category = (eq.get("category") or "Equations").strip()
        hook = (eq.get("hook") or "").strip()
        if title:
            tid = slug(title)
            short = hook or f"{title} — interactive equation in sciencebouk ({category})."
            terms[tid] = {
                "id": tid,
                "label": title,
                "title": title,
                "short": short[:500],
                "lead": short[:280],
                "source_category": category,
            }
        for gloss in eq.get("glossary") or []:
            tooltip = (gloss.get("tooltip") or "").strip()
            for word in gloss.get("words") or []:
                label = word.strip()
                if not label or is_junk_term(slug(label), label):
                    continue
                tid = slug(label)
                desc = tooltip or f"Glossary term from the «{title}» equation scene."
                entry = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "short": desc[:400],
                    "lead": desc[:280],
                    "source_category": category,
                }
                if tid not in terms or len(desc) > len(terms[tid].get("short", "")):
                    terms[tid] = entry
    return terms


def parse_what_it_means_ts(path: Path) -> dict[str, dict]:
    terms: dict[str, dict] = {}
    if not path.exists():
        return terms
    text = path.read_text(encoding="utf-8", errors="replace")
    for m in VAR_MEANING_RE.finditer(text):
        symbol, name, meaning = m.group(1), m.group(2), m.group(3)
        label = name.strip()
        if is_junk_term(slug(label), label):
            continue
        tid = slug(label)
        short = meaning.strip()
        lead = f"**{label}** (`{symbol}`): {short}"
        entry = {
            "id": tid,
            "label": label,
            "title": label,
            "short": short[:400],
            "lead": lead[:280],
            "source_category": "Equation variables",
            "aliases": [symbol] if symbol != label else [],
        }
        if tid not in terms or len(short) > len(terms[tid].get("short", "")):
            terms[tid] = entry
    return terms


def parse_frontend_data(data_dir: Path) -> dict[str, dict]:
    terms: dict[str, dict] = {}
    terms.update(parse_equations_json(data_dir / "equations.json"))
    terms.update(parse_what_it_means_ts(data_dir / "whatItMeans.ts"))
    return terms


def merge_rich(terms: dict[str, dict], rich_path: Path) -> None:
    if not rich_path.exists():
        return
    rich = json.loads(rich_path.read_text(encoding="utf-8"))
    for tid, overlay in rich.get("terms", {}).items():
        base = terms.get(tid, {"id": tid, "label": overlay.get("label", tid), "title": overlay.get("title", tid)})
        base.update(overlay)
        terms[tid] = base


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--glossary", action="append", default=[], type=Path)
    ap.add_argument("--lessons", action="append", default=[], type=Path)
    ap.add_argument("--rich", type=Path, default=None)
    ap.add_argument("--frontend-data", type=Path, default=None)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    terms: dict[str, dict] = {}
    for gpath in args.glossary:
        if not gpath.exists():
            continue
        gtext = gpath.read_text(encoding="utf-8", errors="replace")
        if "### " in gtext:
            terms.update(parse_glossary_h3(gtext))
        if re.search(r"^- \*\*", gtext, re.MULTILINE):
            for k, v in parse_glossary_bullets(gtext).items():
                terms.setdefault(k, v)

    terms.update(parse_lesson_bullets(args.lessons))
    if args.frontend_data:
        terms.update(parse_frontend_data(args.frontend_data))
    if args.rich:
        merge_rich(terms, args.rich)

    terms = {
        k: v for k, v in terms.items()
        if not is_junk_term(k, v.get("label", k))
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps({"version": 1, "terms": terms}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(terms)} terms → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())