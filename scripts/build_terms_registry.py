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
    if args.rich:
        merge_rich(terms, args.rich)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps({"version": 1, "terms": terms}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(terms)} terms → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())